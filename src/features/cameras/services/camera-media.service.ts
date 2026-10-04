import type {
  IArgusSocket,
  ICameraMediaOpenInput,
  ICameraMediaService,
  ICameraMediaSession,
} from '@/core/interfaces';
import type { CameraStreamState } from '@/core/types';
import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { sessionService } from '@/core/services/session.service';
import {
  CAMERA_STREAM_ACK_INTERVAL_MS,
  CAMERA_STREAM_ACK_THRESHOLD_BYTES,
  CAMERA_STREAM_CONNECT_TIMEOUT_MS,
  CAMERA_STREAM_FRAME_HEADER_BYTES,
  CAMERA_STREAM_FRAME_MAGIC,
  CAMERA_STREAM_STALL_MS,
  CAMERA_STREAM_WATCHDOG_MS,
  CAMERA_STREAM_WS_PATH,
} from '@/features/cameras/constants';
import { FragmentAssembler } from '@/features/cameras/model/fragment-assembler';
import { StreamMeter, type StreamStats } from '@/features/cameras/model/stream-meter';
import {
  isStalled,
  refusalOf,
  retryDelayMs,
  stateAfterFailure,
  type SubscribeRefusal,
} from '@/features/cameras/model/stream-recovery';

const KEYFRAME_FLAG = 0x01;
const INIT_FRAME_TYPE = 1;
const MEDIA_FRAME_TYPE = 2;

type ServerFrame = {
  type?: string;
  status?: number;
  error?: string;
  payload?: { subId?: number; reason?: string };
};

class CameraMediaSession implements ICameraMediaSession {
  private socket: IArgusSocket | null = null;
  private closed = false;
  private subId: number | null = null;
  private pendingAck = 0;
  private attempt = 0;
  private receivedMedia = false;
  private opened = false;
  private subscribedAt = 0;
  private lastMediaAt = 0;
  private fragmentKey = false;
  private state: CameraStreamState | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private ackTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private readonly assembler = new FragmentAssembler();
  private readonly meter = new StreamMeter();

  constructor(private readonly input: ICameraMediaOpenInput) {}

  start(): CameraMediaSession {
    this.ackTimer = setInterval(() => this.flushAck(), CAMERA_STREAM_ACK_INTERVAL_MS);
    this.watchdogTimer = setInterval(() => this.watchStall(), CAMERA_STREAM_WATCHDOG_MS);
    void this.connect();
    return this;
  }

  retry(): void {
    if (this.closed) return;
    this.clearRetry();
    this.attempt = 0;
    void this.connect();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.clearRetry();
    if (this.ackTimer) clearInterval(this.ackTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    this.ackTimer = null;
    this.watchdogTimer = null;
    this.unsubscribe();
    this.detachSocket();
    this.publish('closed');
  }

  private publish(state: CameraStreamState): void {
    if (this.state === state) return;
    this.state = state;
    this.input.events?.onState?.(state);
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private detachSocket(): void {
    if (this.connectTimer) clearTimeout(this.connectTimer);
    this.connectTimer = null;
    const socket = this.socket;
    this.socket = null;
    this.subId = null;
    this.pendingAck = 0;
    this.opened = false;
    this.subscribedAt = 0;
    if (!socket) return;
    socket.onOpen = null;
    socket.onMessage = null;
    socket.onError = null;
    socket.onClose = null;
    socket.close(1000, 'closed');
  }

  private async connect(): Promise<void> {
    if (this.closed) return;
    this.detachSocket();
    this.publish(this.attempt === 0 ? 'connecting' : stateAfterFailure(this.attempt));

    const accessToken = sessionService.getAccessToken();
    let socket: IArgusSocket;
    try {
      const instance = await netService.instance();
      if (!accessToken || !instance) throw new Error('CAMERA_STREAM_NO_SESSION');
      socket = await netService.openSocket({
        url: serviceUrl(instance, CAMERA_STREAM_WS_PATH, 'wss'),
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (reason) {
      if ((reason as { code?: string } | null)?.code === 'UNAUTHORIZED') void this.refreshAndRetry();
      else this.fail('retry');
      return;
    }
    if (this.closed || this.socket) {
      socket.close(1000, 'closed');
      return;
    }

    this.socket = socket;
    this.connectTimer = setTimeout(() => {
      if (this.socket === socket && !this.opened) this.fail('retry');
    }, CAMERA_STREAM_CONNECT_TIMEOUT_MS);
    socket.onOpen = () => {
      if (this.socket !== socket) return;
      this.opened = true;
      this.subscribe();
    };
    socket.onMessage = (message, data) => {
      if (this.socket !== socket) return;
      if (data) this.handleBinary(data);
      else if (message) this.handleText(message);
    };
    socket.onError = (code, message) => {
      if (this.socket !== socket) return;
      this.input.events?.onError?.(code, message);
      if (code === 'UNAUTHORIZED') void this.refreshAndRetry();
      else this.fail('retry');
    };
    socket.onClose = () => {
      if (this.socket === socket) this.fail('retry');
    };
  }

  private async refreshAndRetry(): Promise<void> {
    this.detachSocket();
    const outcome = await sessionService.refreshSession();
    if (this.closed) return;
    if (outcome === 'rejected') {
      this.publish('unavailable');
      return;
    }
    this.fail('retry');
  }

  private fail(refusal: SubscribeRefusal): void {
    if (this.closed) return;
    this.clearRetry();
    this.detachSocket();
    if (refusal === 'final') {
      this.publish('unavailable');
      return;
    }
    this.scheduleRetry(refusal, () => void this.connect());
  }

  private resubscribe(refusal: SubscribeRefusal): void {
    if (this.closed) return;
    if (refusal === 'final') {
      this.fail('final');
      return;
    }
    this.clearRetry();
    this.subId = null;
    this.pendingAck = 0;
    this.subscribedAt = 0;
    this.scheduleRetry(refusal, () => {
      if (this.socket) this.subscribe();
      else void this.connect();
    });
  }

  private scheduleRetry(refusal: SubscribeRefusal, resume: () => void): void {
    this.attempt += 1;
    this.receivedMedia = false;
    this.lastMediaAt = 0;
    this.publish(stateAfterFailure(this.attempt));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      resume();
    }, retryDelayMs(this.attempt, refusal, Math.random()));
  }

  private subscribe(): void {
    this.assembler.reset();
    this.input.sink.resetStream();
    this.receivedMedia = false;
    this.lastMediaAt = 0;
    this.subscribedAt = Date.now();
    this.socket?.sendText(
      JSON.stringify({
        type: 'camera:subscribe',
        payload: {
          cameraId: this.input.cameraId,
          quality: this.input.quality,
          fastStart: this.input.fastStart === true,
        },
      }),
    );
  }

  private unsubscribe(): void {
    if (!this.socket || this.subId == null) return;
    this.socket.sendText(
      JSON.stringify({ type: 'camera:unsubscribe', payload: { subId: this.subId } }),
    );
  }

  private handleText(message: string): void {
    let frame: ServerFrame;
    try {
      frame = JSON.parse(message) as ServerFrame;
    } catch {
      return;
    }
    if (frame.type === 'camera:ready' && frame.payload?.subId != null) {
      this.subId = frame.payload.subId;
      return;
    }
    if (frame.type === 'camera:closed') {
      if (this.subId == null || frame.payload?.subId === this.subId) this.resubscribe('retry');
      return;
    }
    if (frame.type === 'camera:subscribe_error') {
      this.input.events?.onError?.('CAMERA_STREAM_ERROR', frame.error ?? frame.type);
      this.resubscribe(refusalOf(frame.status));
    }
  }

  private handleBinary(data: ArrayBuffer): void {
    if (data.byteLength < CAMERA_STREAM_FRAME_HEADER_BYTES) return;
    const header = new DataView(data, 0, CAMERA_STREAM_FRAME_HEADER_BYTES);
    if (header.getUint8(0) !== CAMERA_STREAM_FRAME_MAGIC) return;

    const type = header.getUint8(2);
    const keyframe = (header.getUint8(3) & KEYFRAME_FLAG) === KEYFRAME_FLAG;
    this.subId = header.getUint16(4);
    const payload = new Uint8Array(data, CAMERA_STREAM_FRAME_HEADER_BYTES);

    if (type === INIT_FRAME_TYPE) {
      this.assembler.reset();
      const init = payload.slice();
      this.reportStats(this.meter.init(init));
      this.input.sink.pushFragment(INIT_FRAME_TYPE, true, init.buffer);
      return;
    }
    if (type !== MEDIA_FRAME_TYPE) return;

    if (this.assembler.pendingBytes() === 0) this.fragmentKey = keyframe;
    for (const fragment of this.assembler.push(payload)) {
      if (this.input.events?.onStats) this.reportStats(this.meter.fragment(fragment));
      this.input.sink.pushFragment(MEDIA_FRAME_TYPE, this.fragmentKey, fragment.buffer);
      this.fragmentKey = false;
    }
    this.pendingAck += payload.byteLength;
    this.lastMediaAt = Date.now();
    if (!this.receivedMedia) {
      this.receivedMedia = true;
      this.attempt = 0;
      this.publish('live');
    }
    this.flushAck();
  }

  private reportStats(stats: StreamStats | null): void {
    if (stats) this.input.events?.onStats?.(stats);
  }

  private flushAck(): void {
    if (this.closed || !this.socket || this.subId == null || this.pendingAck <= 0) return;
    if (this.input.sink.bufferedBytes() > CAMERA_STREAM_ACK_THRESHOLD_BYTES) return;
    this.socket.sendText(
      JSON.stringify({
        type: 'camera:ack',
        payload: { subId: this.subId, bytes: this.pendingAck },
      }),
    );
    this.pendingAck = 0;
  }

  private watchStall(): void {
    if (this.closed || this.retryTimer || !this.socket) return;
    const now = Date.now();
    const waitingSince = this.receivedMedia ? this.lastMediaAt : this.subscribedAt;
    if (this.receivedMedia && this.input.sink.bufferedBytes() > CAMERA_STREAM_ACK_THRESHOLD_BYTES) return;
    if (!isStalled(waitingSince, now, CAMERA_STREAM_STALL_MS)) return;
    this.unsubscribe();
    this.resubscribe('retry');
  }
}

class CameraMediaService implements ICameraMediaService {
  open(input: ICameraMediaOpenInput): Promise<ICameraMediaSession> {
    return Promise.resolve(new CameraMediaSession(input).start());
  }
}

export const cameraMediaService: ICameraMediaService = new CameraMediaService();
