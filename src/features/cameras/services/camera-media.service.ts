import type {
  IArgusSocket,
  ICameraMediaOpenInput,
  ICameraMediaService,
  ICameraMediaSession,
} from '@/core/interfaces';
import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { sessionService } from '@/core/services/session.service';
import { CAMERA_STREAM_ACK_INTERVAL_MS, CAMERA_STREAM_ACK_THRESHOLD_BYTES, CAMERA_STREAM_FRAME_HEADER_BYTES, CAMERA_STREAM_FRAME_MAGIC, CAMERA_STREAM_RECONNECT_BASE_MS, CAMERA_STREAM_RECONNECT_MAX_MS, CAMERA_STREAM_WS_PATH } from '@/features/cameras/constants';

const KEYFRAME_FLAG = 0x01;
const INIT_FRAME_TYPE = 1;

class CameraMediaSession implements ICameraMediaSession {
  private socket: IArgusSocket | null = null;
  private closed = false;
  private subId: number | null = null;
  private pendingAck = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private ackTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly input: ICameraMediaOpenInput) {}

  async start(): Promise<CameraMediaSession> {
    this.ackTimer = setInterval(
      () => this.flushAck(),
      CAMERA_STREAM_ACK_INTERVAL_MS,
    );
    try {
      await this.connect();
    } catch {
      this.scheduleReconnect();
    }
    return this;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ackTimer) clearInterval(this.ackTimer);
    this.reconnectTimer = null;
    this.ackTimer = null;
    this.unsubscribe();
    this.socket?.close(1000, 'closed');
    this.socket = null;
    this.input.events?.onState?.('closed');
  }

  private async connect(): Promise<void> {
    if (this.closed) return;
    this.input.events?.onState?.(
      this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting',
    );

    const accessToken = sessionService.getAccessToken();
    const instance = await netService.instance();
    if (!accessToken || !instance) throw new Error('CAMERA_STREAM_NO_SESSION');

    this.input.sink.resetStream();
    const socket = await netService.openSocket({
      url: serviceUrl(instance, CAMERA_STREAM_WS_PATH, 'wss'),
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (this.closed) {
      socket.close(1000, 'closed');
      return;
    }

    this.socket = socket;
    socket.onOpen = () => {
      this.reconnectAttempt = 0;
      this.subscribe();
    };
    socket.onMessage = (message, data) => {
      if (data) this.handleBinary(data);
      else if (message) this.handleText(message);
    };
    socket.onError = (code, message) => {
      this.input.events?.onError?.(code, message);
      this.scheduleReconnect();
    };
    socket.onClose = () => this.scheduleReconnect();
  }

  private subscribe(): void {
    this.socket?.sendText(
      JSON.stringify({
        type: 'camera:subscribe',
        payload: {
          cameraId: this.input.cameraId,
          quality: this.input.quality,
        },
      }),
    );
  }

  private unsubscribe(): void {
    if (!this.socket || this.subId == null) return;
    this.socket.sendText(
      JSON.stringify({
        type: 'camera:unsubscribe',
        payload: { subId: this.subId },
      }),
    );
  }

  private handleText(message: string): void {
    let json: { type?: string; payload?: { subId?: number }; error?: string };
    try {
      json = JSON.parse(message) as typeof json;
    } catch {
      return;
    }
    if (json.type === 'camera:ready' && json.payload?.subId != null) {
      this.subId = json.payload.subId;
      this.input.events?.onState?.('live');
      return;
    }
    if (typeof json.type === 'string' && json.type.endsWith('_error')) {
      this.input.events?.onError?.(
        'CAMERA_STREAM_ERROR',
        json.error ?? json.type,
      );
    }
  }

  private handleBinary(data: ArrayBuffer): void {
    if (data.byteLength < CAMERA_STREAM_FRAME_HEADER_BYTES) return;
    const header = new Uint8Array(data, 0, CAMERA_STREAM_FRAME_HEADER_BYTES);
    if (header[0] !== CAMERA_STREAM_FRAME_MAGIC) return;

    const type = header[2];
    const keyframe = (header[3] & KEYFRAME_FLAG) === KEYFRAME_FLAG;
    this.subId = (header[4] << 8) | header[5];

    const payload = data.slice(CAMERA_STREAM_FRAME_HEADER_BYTES);
    this.input.sink.pushFragment(type, keyframe, payload);
    if (type !== INIT_FRAME_TYPE) {
      this.pendingAck += payload.byteLength;
      this.flushAck();
    }
  }

  private flushAck(): void {
    if (this.closed || !this.socket || this.subId == null) return;
    if (this.pendingAck <= 0) return;
    if (this.input.sink.bufferedBytes() > CAMERA_STREAM_ACK_THRESHOLD_BYTES)
      return;
    this.socket.sendText(
      JSON.stringify({
        type: 'camera:ack',
        payload: { subId: this.subId, bytes: this.pendingAck },
      }),
    );
    this.pendingAck = 0;
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    this.socket = null;
    this.subId = null;
    this.pendingAck = 0;
    this.input.events?.onState?.('reconnecting');
    const delay = Math.min(
      CAMERA_STREAM_RECONNECT_MAX_MS,
      CAMERA_STREAM_RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch(() => this.scheduleReconnect());
    }, delay);
  }
}

class CameraMediaService implements ICameraMediaService {
  open(input: ICameraMediaOpenInput): Promise<ICameraMediaSession> {
    return new CameraMediaSession(input).start();
  }
}

export const cameraMediaService: ICameraMediaService =
  new CameraMediaService();
