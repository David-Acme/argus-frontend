import type { ICameraRtcOpenInput, ICameraRtcSession, ICameraWebRtcAnswer } from '@/core/interfaces';
import type { CameraRtcStream } from '@/core/types';
import { cameraWebRtcAnswerSchema } from '@/core/contracts/http.contract';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import {
  CAMERA_RTC_PROBE_MS,
  CAMERA_RTC_STALL_MS,
  CAMERA_RTC_STATS_MS,
} from '@/features/cameras/constants';
import {
  hasFirstFrame,
  isRtcStalled,
  readRtcStats,
  rtcStreamStats,
  type RtcStatsReading,
  type RtcStatsReport,
} from '@/features/cameras/model/camera-transport';

export type RtcTrack = {
  kind: string;
  enabled: boolean;
};

export type RtcTrackEvent = {
  track: RtcTrack;
  streams: readonly unknown[];
};

export type RtcPeer = {
  readonly connectionState: string;
  addTransceiver(kind: 'audio' | 'video', init: { direction: 'recvonly' }): unknown;
  createOffer(): Promise<{ sdp?: string }>;
  setLocalDescription(description: { type: 'offer'; sdp: string }): Promise<void>;
  setRemoteDescription(description: { type: 'answer'; sdp: string }): Promise<void>;
  getStats(): Promise<RtcStatsReport>;
  addEventListener(type: 'track' | 'connectionstatechange', listener: (event: never) => void): void;
  close(): void;
};

export type RtcPlatform = {
  createPeer(): Promise<RtcPeer>;
  streamWith(current: CameraRtcStream | null, event: RtcTrackEvent): CameraRtcStream | null;
};

const DEAD_STATES = new Set(['failed', 'closed']);

function readAnswer(info: unknown): ICameraWebRtcAnswer {
  const parsed = cameraWebRtcAnswerSchema.safeParse(info);
  if (!parsed.success) throw new Error('CAMERA_RTC_BAD_ANSWER');
  return parsed.data;
}

class CameraRtcSession implements ICameraRtcSession {
  stream: CameraRtcStream | null = null;
  private readonly tracks: RtcTrack[] = [];
  private closed = false;
  private live = false;
  private audioEnabled = true;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private previous: RtcStatsReading | null = null;
  private lastProgressAt = 0;

  constructor(
    private readonly peer: RtcPeer,
    private readonly platform: RtcPlatform,
    private readonly input: ICameraRtcOpenInput,
  ) {}

  async start(): Promise<void> {
    this.peer.addTransceiver('video', { direction: 'recvonly' });
    this.peer.addTransceiver('audio', { direction: 'recvonly' });
    this.peer.addEventListener('track', (event: RtcTrackEvent) => this.onTrack(event));
    this.peer.addEventListener('connectionstatechange', () => this.onConnectionState());
    const offer = await this.peer.createOffer();
    if (!offer.sdp) throw new Error('CAMERA_RTC_NO_OFFER');
    await this.peer.setLocalDescription({ type: 'offer', sdp: offer.sdp });
    const response = await cameraControlService.webrtc(this.input.cameraId, {
      sdp: offer.sdp,
      quality: this.input.quality,
    });
    if (!response.ok) throw new Error(response.errors?.code ?? `CAMERA_RTC_${response.status}`);
    const answer = readAnswer(response.info);
    if (this.closed) return;
    await this.peer.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
    this.schedule(CAMERA_RTC_PROBE_MS);
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    for (const track of this.tracks) if (track.kind === 'audio') track.enabled = enabled;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.peer.close();
  }

  private onTrack(event: RtcTrackEvent): void {
    if (this.closed) return;
    if (event.track.kind === 'audio') event.track.enabled = this.audioEnabled;
    this.tracks.push(event.track);
    this.stream = this.platform.streamWith(this.stream, event);
  }

  private onConnectionState(): void {
    if (this.closed || !DEAD_STATES.has(this.peer.connectionState)) return;
    this.drop(`CAMERA_RTC_${this.peer.connectionState.toUpperCase()}`);
  }

  private drop(reason: string): void {
    if (this.closed) return;
    this.close();
    this.input.events.onDrop(reason);
  }

  private schedule(delay: number): void {
    if (this.closed) return;
    this.timer = setTimeout(() => void this.sample(), delay);
  }

  private async sample(): Promise<void> {
    this.timer = null;
    let report: RtcStatsReport;
    try {
      report = await this.peer.getStats();
    } catch {
      this.schedule(CAMERA_RTC_STATS_MS);
      return;
    }
    if (this.closed) return;
    const now = Date.now();
    const reading = readRtcStats(report, now);
    if (!this.previous || reading.framesDecoded > this.previous.framesDecoded) this.lastProgressAt = now;
    if (!this.live && hasFirstFrame(reading) && this.stream) {
      this.live = true;
      this.input.events.onLive();
    }
    if (this.live) {
      if (isRtcStalled(this.lastProgressAt, now, CAMERA_RTC_STALL_MS)) {
        this.drop('CAMERA_RTC_STALLED');
        return;
      }
      this.input.events.onStats(rtcStreamStats(this.previous, reading));
    }
    this.previous = reading;
    this.schedule(this.live ? CAMERA_RTC_STATS_MS : CAMERA_RTC_PROBE_MS);
  }
}

export async function openRtcSession(platform: RtcPlatform, input: ICameraRtcOpenInput): Promise<ICameraRtcSession> {
  const peer = await platform.createPeer();
  const session = new CameraRtcSession(peer, platform, input);
  try {
    await session.start();
  } catch (reason) {
    session.close();
    throw reason;
  }
  return session;
}
