import type {
  ICameraLiveOpenInput,
  ICameraLiveService,
  ICameraLiveSession,
  ICameraMediaSession,
  ICameraRtcSession,
  ICameraPictureStats,
} from '@/core/interfaces';
import type { CameraStreamState, CameraTransport } from '@/core/types';
import { log } from '@/core/services/log';
import { CAMERA_RTC_FIRST_FRAME_MS, CAMERA_RTC_RECONNECTS } from '@/features/cameras/constants';
import {
  afterRtcFailure,
  afterRtcSuccess,
  firstTransport,
  INITIAL_RTC_BACKOFF,
  type RtcBackoff,
} from '@/features/cameras/model/camera-transport';
import { cameraMediaService } from '@/features/cameras/services/camera-media.service';
import { cameraRtcService } from '@/features/cameras/services/camera-rtc';

type RtcAttempt = 'first' | 'reconnect' | 'upgrade';

let rtcBackoff: RtcBackoff = INITIAL_RTC_BACKOFF;

class CameraLiveSession implements ICameraLiveSession {
  private closed = false;
  private transport: CameraTransport | null = null;
  private rtc: ICameraRtcSession | null = null;
  private rtcLive = false;
  private rtcGeneration = 0;
  private reconnects = 0;
  private ws: ICameraMediaSession | null = null;
  private wsGeneration = 0;
  private state: CameraStreamState | null = null;
  private audioEnabled = true;
  private firstFrameTimer: ReturnType<typeof setTimeout> | null = null;
  private upgradeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly input: ICameraLiveOpenInput) {}

  start(): CameraLiveSession {
    const choice = firstTransport({
      rtcSupported: cameraRtcService.supported(),
      backoff: rtcBackoff,
      now: Date.now(),
    });
    if (choice === 'webrtc') this.tryRtc('first');
    else this.startWs();
    return this;
  }

  retry(): void {
    if (this.closed) return;
    if (this.ws) {
      this.ws.retry();
      return;
    }
    this.reconnects = 0;
    this.tryRtc('first');
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    this.rtc?.setAudioEnabled(enabled);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.clearTimers();
    this.closeRtc();
    this.closeWs();
    this.publish('closed');
  }

  private publish(state: CameraStreamState): void {
    if (this.state === state) return;
    this.state = state;
    this.input.events?.onState?.(state);
  }

  private useTransport(transport: CameraTransport): void {
    if (this.transport === transport) return;
    this.transport = transport;
    this.input.events?.onTransport?.(transport);
  }

  private clearTimers(): void {
    if (this.firstFrameTimer) clearTimeout(this.firstFrameTimer);
    if (this.upgradeTimer) clearTimeout(this.upgradeTimer);
    this.firstFrameTimer = null;
    this.upgradeTimer = null;
  }

  private closeRtc(): void {
    this.rtcGeneration += 1;
    this.rtcLive = false;
    if (this.firstFrameTimer) clearTimeout(this.firstFrameTimer);
    this.firstFrameTimer = null;
    const session = this.rtc;
    this.rtc = null;
    session?.close();
    this.input.events?.onRtcStream?.(null);
  }

  private closeWs(): void {
    this.wsGeneration += 1;
    const session = this.ws;
    this.ws = null;
    session?.close();
  }

  private tryRtc(attempt: RtcAttempt): void {
    if (this.closed) return;
    this.closeRtc();
    const generation = this.rtcGeneration;
    if (attempt === 'first') this.publish('connecting');
    if (attempt === 'reconnect') this.publish('reconnecting');
    const current = () => !this.closed && generation === this.rtcGeneration;
    this.firstFrameTimer = setTimeout(() => {
      if (current() && !this.rtcLive) this.rtcFailed(attempt, 'CAMERA_RTC_NO_FRAME');
    }, CAMERA_RTC_FIRST_FRAME_MS);
    cameraRtcService
      .open({
        cameraId: this.input.cameraId,
        quality: this.input.quality,
        events: {
          onLive: () => {
            if (current()) this.rtcBecameLive();
          },
          onStats: (stats) => {
            if (current() && this.transport === 'webrtc') this.reportStats(stats, 'webrtc');
          },
          onDrop: (reason) => {
            if (current()) this.rtcDropped(attempt, reason);
          },
        },
      })
      .then((session) => {
        if (!current()) {
          session.close();
          return;
        }
        this.rtc = session;
        session.setAudioEnabled(this.audioEnabled);
        this.input.events?.onRtcStream?.(session.stream);
      })
      .catch((reason: unknown) => {
        if (current())
          this.rtcFailed(attempt, reason instanceof Error ? reason.message : 'CAMERA_RTC_FAILED');
      });
  }

  private rtcBecameLive(): void {
    if (this.firstFrameTimer) clearTimeout(this.firstFrameTimer);
    this.firstFrameTimer = null;
    this.rtcLive = true;
    this.reconnects = 0;
    rtcBackoff = afterRtcSuccess();
    if (this.rtc) this.input.events?.onRtcStream?.(this.rtc.stream);
    if (this.upgradeTimer) clearTimeout(this.upgradeTimer);
    this.upgradeTimer = null;
    this.closeWs();
    this.useTransport('webrtc');
    this.publish('live');
  }

  private rtcDropped(attempt: RtcAttempt, reason: string): void {
    if (this.rtcLive && this.reconnects < CAMERA_RTC_RECONNECTS) {
      this.reconnects += 1;
      log.debug('camera-live', 'WebRTC dropped, reconnecting', reason);
      this.tryRtc('reconnect');
      return;
    }
    this.rtcFailed(this.rtcLive ? 'reconnect' : attempt, reason);
  }

  private rtcFailed(attempt: RtcAttempt, reason: string): void {
    log.debug('camera-live', 'WebRTC unavailable, using the WebSocket', reason);
    rtcBackoff = afterRtcFailure(rtcBackoff, Date.now());
    this.closeRtc();
    if (attempt === 'upgrade' && this.ws) {
      this.scheduleUpgrade();
      return;
    }
    this.startWs();
  }

  private startWs(): void {
    if (this.closed || this.ws) return;
    this.closeWs();
    const generation = this.wsGeneration;
    const current = () => !this.closed && generation === this.wsGeneration;
    this.useTransport('ws');
    void cameraMediaService
      .open({
        cameraId: this.input.cameraId,
        quality: this.input.quality,
        fastStart: this.input.fastStart,
        sink: this.input.sink,
        events: {
          onState: (state) => {
            if (current() && this.transport === 'ws') this.publish(state);
          },
          onStats: (stats) => {
            if (current() && this.transport === 'ws') this.reportStats(stats, 'ws');
          },
        },
      })
      .then((session) => {
        if (current()) this.ws = session;
        else session.close();
      });
    this.scheduleUpgrade();
  }

  private scheduleUpgrade(): void {
    if (this.closed || !cameraRtcService.supported()) return;
    if (this.upgradeTimer) clearTimeout(this.upgradeTimer);
    const delay = Math.max(0, rtcBackoff.retryAt - Date.now());
    this.upgradeTimer = setTimeout(() => {
      this.upgradeTimer = null;
      if (!this.closed && this.transport === 'ws') this.tryRtc('upgrade');
    }, delay);
  }

  private reportStats(stats: ICameraPictureStats, transport: CameraTransport): void {
    this.input.events?.onStats?.({ ...stats, transport });
  }
}

class CameraLiveService implements ICameraLiveService {
  open(input: ICameraLiveOpenInput): ICameraLiveSession {
    return new CameraLiveSession(input).start();
  }
}

export const cameraLiveService: ICameraLiveService = new CameraLiveService();
