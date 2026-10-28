import type { IArgusSocket } from '@/core/interfaces';
import type { SessionCredential } from '@/core/types';
import {
  CAMERA_STREAM_ACK_INTERVAL_MS,
  CAMERA_STREAM_FRAME_HEADER_BYTES,
  CAMERA_STREAM_STALL_MS,
} from '@/features/cameras/constants';
import {
  PREVIEW_ANSWER_TIMEOUT_MS,
  PREVIEW_LINGER_MS,
} from '@/features/cameras/constants/preview.constant';
import { mediaCloseAction, type MediaFrame } from '@/features/cameras/model/media-access';
import {
  firstInOrder,
  previewAckFrame,
  previewSubscribeFrame,
  previewUnsubscribeFrame,
  readMediaHeader,
} from '@/features/cameras/model/camera-preview';
import {
  refusalOf,
  retryDelayMs,
  type SubscribeRefusal,
} from '@/features/cameras/model/stream-recovery';
import { mediaDeps } from '@/features/cameras/services/camera-media.service';
import type { CameraMediaDeps } from '@/features/cameras/services/camera-media-session';
import { MediaAccessRenewal } from '@/features/cameras/services/media-access-renewal';
import { PreviewChannel, type PreviewEntry } from '@/features/cameras/services/preview-channel';

type ServerFrame = MediaFrame & {
  status?: number;
  payload?: { subId?: number };
};

type Timer = ReturnType<typeof setTimeout>;

export class CameraPreviewMux {
  private socket: IArgusSocket | null = null;
  private opened = false;
  private connecting = false;
  private attempt = 0;
  private nextKey = 0;
  private asking: PreviewChannel | null = null;
  private askTimer: Timer | null = null;
  private lingerTimer: Timer | null = null;
  private reconnectTimer: Timer | null = null;
  private tick: ReturnType<typeof setInterval> | null = null;
  private access: MediaAccessRenewal | null = null;
  private readonly channels = new Map<string, PreviewChannel>();
  private readonly bySub = new Map<number, PreviewChannel>();
  private readonly held = new Map<string, Timer | null>();
  private readonly released = new Set<number>();

  constructor(private readonly deps: CameraMediaDeps) {}

  attach(entry: PreviewEntry): () => void {
    this.nextKey += 1;
    const channel = new PreviewChannel(String(this.nextKey), entry);
    this.channels.set(channel.key, channel);
    this.clearTimer('lingerTimer');
    channel.publish('connecting');
    if (this.socket) this.pump();
    else if (!this.reconnectTimer) void this.connect();
    return () => this.detach(channel);
  }

  private detach(channel: PreviewChannel): void {
    if (!this.channels.delete(channel.key)) return;
    const held = this.held.get(channel.key);
    if (held) clearTimeout(held);
    this.held.delete(channel.key);
    this.end(channel);
    if (this.channels.size > 0) return;
    this.lingerTimer = setTimeout(() => {
      this.lingerTimer = null;
      if (this.channels.size === 0) this.shutdown();
    }, PREVIEW_LINGER_MS);
  }

  private end(channel: PreviewChannel): void {
    if (channel.subId == null) return;
    this.bySub.delete(channel.subId);
    this.release(channel.subId);
    channel.reset();
  }

  private release(subId: number): void {
    this.released.add(subId);
    this.socket?.sendText(previewUnsubscribeFrame(subId));
  }

  private clearTimer(name: 'askTimer' | 'lingerTimer' | 'reconnectTimer'): void {
    const timer = this[name];
    if (timer) clearTimeout(timer);
    this[name] = null;
  }

  private shutdown(): void {
    this.closeSocket();
    this.clearTimer('reconnectTimer');
    this.access?.dispose();
    this.access = null;
    this.attempt = 0;
  }

  private async connect(): Promise<void> {
    if (this.socket || this.connecting || this.channels.size === 0) return;
    this.connecting = true;
    const credential = this.deps.credential();
    let socket: IArgusSocket;
    try {
      if (!credential.accessToken) throw new Error('CAMERA_STREAM_NO_SESSION');
      socket = await this.deps.openSocket(credential.accessToken);
    } catch (reason) {
      this.connecting = false;
      if ((reason as { code?: string } | null)?.code === 'UNAUTHORIZED')
        void this.refresh(credential);
      else this.scheduleReconnect();
      return;
    }
    this.connecting = false;
    if (this.channels.size === 0 || this.socket) {
      socket.close(1000, 'closed');
      return;
    }
    this.bind(socket, credential);
  }

  private bind(socket: IArgusSocket, credential: SessionCredential): void {
    this.socket = socket;
    this.access ??= new MediaAccessRenewal(this.deps);
    this.access.attach(socket, credential);
    this.tick = setInterval(() => this.service(), CAMERA_STREAM_ACK_INTERVAL_MS);
    socket.onOpen = () => {
      if (this.socket !== socket) return;
      this.opened = true;
      this.access?.opened();
      this.pump();
    };
    socket.onMessage = (message, data) => {
      if (this.socket !== socket) return;
      if (data) this.onBinary(data);
      else if (message) this.onText(message);
    };
    socket.onError = (code) => {
      if (this.socket !== socket) return;
      if (code === 'UNAUTHORIZED') void this.refresh(credential);
      else this.drop();
    };
    socket.onClose = (code, reason) => {
      if (this.socket !== socket) return;
      if (mediaCloseAction(code, reason) === 'refresh')
        void this.refresh(this.access?.credential ?? credential);
      else this.drop();
    };
  }

  private closeSocket(): void {
    this.clearTimer('askTimer');
    if (this.tick) clearInterval(this.tick);
    this.tick = null;
    this.asking = null;
    this.bySub.clear();
    this.released.clear();
    this.access?.detach();
    const socket = this.socket;
    this.socket = null;
    this.opened = false;
    for (const channel of this.channels.values()) {
      channel.reset();
      channel.publish('connecting');
    }
    if (!socket) return;
    socket.onOpen = null;
    socket.onMessage = null;
    socket.onError = null;
    socket.onClose = null;
    socket.close(1000, 'closed');
  }

  private drop(): void {
    this.closeSocket();
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.channels.size === 0 || this.reconnectTimer) return;
    this.attempt += 1;
    this.reconnectTimer = setTimeout(
      () => {
        this.reconnectTimer = null;
        void this.connect();
      },
      retryDelayMs(this.attempt, 'retry', Math.random())
    );
  }

  private async refresh(failed: SessionCredential): Promise<void> {
    this.closeSocket();
    const outcome = await this.deps.refresh(failed);
    if (outcome === 'rejected') {
      for (const channel of this.channels.values()) channel.publish('waiting');
      return;
    }
    if (outcome === 'refreshed') void this.connect();
    else this.scheduleReconnect();
  }

  private pump(): void {
    if (!this.socket || !this.opened || this.asking) return;
    const waiting = [...this.channels.values()].filter(
      (channel) => channel.subId == null && !this.held.has(channel.key)
    );
    const next = firstInOrder(waiting);
    if (!next) return;
    this.asking = next;
    this.socket.sendText(previewSubscribeFrame(next.entry.cameraId, next.entry.fastStart));
    this.askTimer = setTimeout(() => {
      this.askTimer = null;
      if (this.asking !== next) return;
      this.asking = null;
      this.holdBack(next, 'retry');
      this.pump();
    }, PREVIEW_ANSWER_TIMEOUT_MS);
  }

  private answered(): PreviewChannel | null {
    const channel = this.asking;
    this.asking = null;
    this.clearTimer('askTimer');
    return channel && this.channels.has(channel.key) ? channel : null;
  }

  private holdBack(channel: PreviewChannel, refusal: SubscribeRefusal): void {
    if (refusal === 'final') {
      this.held.set(channel.key, null);
      channel.publish('waiting');
      return;
    }
    channel.failures += 1;
    const timer = setTimeout(
      () => {
        this.held.delete(channel.key);
        this.pump();
      },
      retryDelayMs(channel.failures, refusal, Math.random())
    );
    this.held.set(channel.key, timer);
  }

  private onText(message: string): void {
    let frame: ServerFrame;
    try {
      frame = JSON.parse(message) as ServerFrame;
    } catch {
      return;
    }
    if (this.access?.handle(frame)) return;
    if (frame.type === 'camera:ready') this.onReady(frame.payload?.subId);
    else if (frame.type === 'camera:subscribe_error') this.onRefused(refusalOf(frame.status));
    else if (frame.type === 'camera:privacy') this.onRefused('busy');
    else if (frame.type === 'camera:closed') this.onClosed(frame.payload?.subId);
  }

  private onReady(subId: number | undefined): void {
    const channel = this.answered();
    if (subId != null) {
      this.released.delete(subId);
      if (channel) {
        channel.begin(subId, Date.now());
        this.bySub.set(subId, channel);
      } else if (!this.bySub.has(subId)) this.release(subId);
    }
    this.pump();
  }

  private onRefused(refusal: SubscribeRefusal): void {
    const channel = this.answered();
    channel?.reset();
    if (channel) this.holdBack(channel, refusal);
    this.pump();
  }

  private onClosed(subId: number | undefined): void {
    const channel = this.bySub.get(subId ?? -1);
    if (!channel || subId == null) return;
    this.bySub.delete(subId);
    channel.reset();
    channel.publish('connecting');
    this.holdBack(channel, 'retry');
    this.pump();
  }

  private onBinary(data: ArrayBuffer): void {
    const header = readMediaHeader(data);
    if (!header || this.released.has(header.subId)) return;
    let channel = this.bySub.get(header.subId);
    if (!channel && this.asking && this.channels.has(this.asking.key)) {
      channel = this.asking;
      channel.begin(header.subId, Date.now());
      this.bySub.set(header.subId, channel);
    }
    if (!channel) return;
    const payload = new Uint8Array(data, CAMERA_STREAM_FRAME_HEADER_BYTES);
    if (channel.receive(header, payload, Date.now())) this.attempt = 0;
  }

  private service(): void {
    const socket = this.socket;
    if (!socket || !this.opened) return;
    const now = Date.now();
    for (const channel of this.channels.values()) {
      const bytes = channel.takeAck();
      if (bytes > 0 && channel.subId != null)
        socket.sendText(previewAckFrame(channel.subId, bytes));
      if (!channel.stalled(now, CAMERA_STREAM_STALL_MS)) continue;
      this.end(channel);
      channel.publish('connecting');
      this.holdBack(channel, 'retry');
    }
    this.pump();
  }
}

export const cameraPreviewMux = new CameraPreviewMux(mediaDeps);
