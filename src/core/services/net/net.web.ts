import { invoke, Channel } from '@tauri-apps/api/core';
import type { NetSocketOptions } from 'argus-net';

import { DISCOVERY_TIMEOUT_MS } from '@/shared/constants';
import type { IArgusNetService, IArgusSocket } from '@/core/interfaces';
import {
  clearInstance,
  isPaired,
  loadInstance,
  savePairing,
  toNetError,
  updateInstanceAddress,
} from './net-persistence';
import { relocatedInstance, SERVER_IDENTITY_PATH, serviceUrl } from './net-routes';
import type { NetAdoptInput, NetDiscovery, NetHttpRequest, NetHttpResult, NetPairInput, NetPairedInstance, NetPairing } from '@/core/types';

class WebArgusNetService implements IArgusNetService {
  async discover(timeoutMs: number = DISCOVERY_TIMEOUT_MS): Promise<NetDiscovery> {
    try {
      return await invoke<NetDiscovery>('argus_discover', { timeoutMs });
    } catch (error) {
      throw toNetError(error, 'DISCOVERY_NOT_FOUND');
    }
  }

  async pair(input: NetPairInput): Promise<NetPairing> {
    const { host, ip, port, code, routes } = input;
    try {
      const pairing = await invoke<NetPairing>('argus_pair', { host, ip, port, code });
      await savePairing({ pairing, host, ip, routes });
      return pairing;
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async adoptPairing(_input: NetAdoptInput): Promise<void> {
    throw toNetError(
      new Error('NOT_SUPPORTED|Invitation enrollment is available on mobile devices'),
      'NETWORK_ERROR',
    );
  }

  async request(options: NetHttpRequest): Promise<NetHttpResult> {
    try {
      return await invoke<NetHttpResult>('argus_request', {
        request: {
          url: options.url,
          method: options.method,
          headers: options.headers ?? {},
          body: options.body ?? '',
          files: options.files ?? [],
        },
      });
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async requestTrustAny(options: NetHttpRequest): Promise<NetHttpResult> {
    throw toNetError(
      new Error('NOT_SUPPORTED|Trust-any requests are not supported on desktop yet'),
      'NETWORK_ERROR',
    );
  }

  async openSocket(options: NetSocketOptions): Promise<IArgusSocket> {
    const socketId = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const socket = new TauriSocket(socketId);
    await socket.open(options);
    return socket;
  }

  async refreshAddress(): Promise<boolean> {
    const instance = await loadInstance();
    if (!instance) return false;
    let found: NetDiscovery;
    try {
      found = await this.discover();
    } catch {
      return false;
    }
    const candidate = relocatedInstance(instance, found);
    if (!candidate || !(await this.holdsPairedCa(candidate))) return false;
    await updateInstanceAddress({ ip: candidate.ip, routes: candidate.routes });
    return true;
  }

  private async holdsPairedCa(candidate: NetPairedInstance): Promise<boolean> {
    try {
      await invoke<NetHttpResult>('argus_request', {
        request: {
          url: serviceUrl(candidate, SERVER_IDENTITY_PATH),
          method: 'GET',
          headers: {},
          body: '',
          files: [],
        },
        ip: candidate.ip,
      });
      return true;
    } catch {
      return false;
    }
  }

  async isPaired(): Promise<boolean> {
    return isPaired();
  }

  async instance(): Promise<NetPairedInstance | null> {
    return loadInstance();
  }

  async unpair(): Promise<void> {
    await clearInstance();
  }
}

export const netService = new WebArgusNetService();

type TauriSocketEvent = {
  kind: 'open' | 'message' | 'binary' | 'error' | 'close';
  message?: string;
  data?: ArrayBuffer;
  code?: number;
  errorCode?: string;
  reason?: string;
};

const FRAME_OPEN = 0;
const FRAME_TEXT = 1;
const FRAME_BINARY = 2;
const FRAME_ERROR = 3;
const FRAME_CLOSE = 4;

const textDecoder = new TextDecoder();

class TauriSocket implements IArgusSocket {
  private channel: Channel<ArrayBuffer> | null = null;
  private opened = false;
  private closed = false;
  private queued: TauriSocketEvent[] = [];
  private openListener: (() => void) | null = null;
  private messageListener: IArgusSocket['onMessage'] = null;
  private errorListener: IArgusSocket['onError'] = null;
  private closeListener: IArgusSocket['onClose'] = null;

  constructor(private readonly socketId: string) {}

  get onOpen(): (() => void) | null {
    return this.openListener;
  }

  set onOpen(listener: (() => void) | null) {
    this.openListener = listener;
    this.flush();
  }

  get onMessage(): IArgusSocket['onMessage'] {
    return this.messageListener;
  }

  set onMessage(listener: IArgusSocket['onMessage']) {
    this.messageListener = listener;
    this.flush();
  }

  get onError(): IArgusSocket['onError'] {
    return this.errorListener;
  }

  set onError(listener: IArgusSocket['onError']) {
    this.errorListener = listener;
    this.flush();
  }

  get onClose(): IArgusSocket['onClose'] {
    return this.closeListener;
  }

  set onClose(listener: IArgusSocket['onClose']) {
    this.closeListener = listener;
    this.flush();
  }

  async open(options: NetSocketOptions): Promise<void> {
    const channel = new Channel<ArrayBuffer>();
    channel.onmessage = (payload) => this.receiveFrame(payload);
    this.channel = channel;
    try {
      await invoke('argus_socket_open', {
        options: {
          socketId: this.socketId,
          url: options.url,
          headers: options.headers ?? {},
          connectTimeoutMs: options.connectTimeoutMs ?? 8000,
        },
        onEvent: channel,
      });
    } catch (error) {
      this.channel = null;
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  sendText(message: string): void {
    void invoke('argus_socket_send_text', { socketId: this.socketId, message });
  }

  sendBinary(data: ArrayBuffer): void {
    void invoke('argus_socket_send_binary', data, {
      headers: { 'x-argus-socket-id': this.socketId },
    });
  }

  close(code = 1000, reason = ''): void {
    if (this.closed) return;
    this.closed = true;
    void invoke('argus_socket_close', { socketId: this.socketId, code, reason });
    this.channel = null;
  }

  private receiveFrame(payload: ArrayBuffer): void {
    const bytes = new Uint8Array(payload);
    const kind = bytes[0];
    const body = bytes.subarray(1);
    switch (kind) {
      case FRAME_OPEN:
        this.receive({ kind: 'open' });
        break;
      case FRAME_TEXT:
        this.receive({ kind: 'message', message: textDecoder.decode(body) });
        break;
      case FRAME_BINARY:
        this.receive({
          kind: 'binary',
          data: body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
        });
        break;
      case FRAME_ERROR:
        this.receive({
          kind: 'error',
          errorCode: 'NETWORK_ERROR',
          reason: textDecoder.decode(body),
        });
        break;
      case FRAME_CLOSE: {
        const code = new DataView(body.buffer, body.byteOffset, 4).getUint32(0);
        this.receive({
          kind: 'close',
          code,
          reason: textDecoder.decode(body.subarray(4)),
        });
        break;
      }
      default:
        break;
    }
  }

  private receive(event: TauriSocketEvent): void {
    if (event.kind === 'open') this.opened = true;
    if (!this.canDeliver(event)) {
      this.queued.push(event);
      return;
    }
    this.deliver(event);
  }

  private canDeliver(event: TauriSocketEvent): boolean {
    if (event.kind === 'open') return this.openListener != null;
    if (event.kind === 'message' || event.kind === 'binary') return this.messageListener != null;
    if (event.kind === 'error') return this.errorListener != null;
    return this.closeListener != null;
  }

  private flush(): void {
    if (this.queued.length === 0) return;
    const remaining: TauriSocketEvent[] = [];
    for (const event of this.queued) {
      if (this.canDeliver(event)) this.deliver(event);
      else remaining.push(event);
    }
    this.queued = remaining;
  }

  private deliver(event: TauriSocketEvent): void {
    switch (event.kind) {
      case 'open':
        this.openListener?.();
        break;
      case 'message':
        this.messageListener?.(event.message ?? null, null);
        break;
      case 'binary': {
        this.messageListener?.(null, event.data ?? new ArrayBuffer(0));
        break;
      }
      case 'error':
        this.errorListener?.(event.errorCode ?? 'NETWORK_ERROR', event.reason ?? 'Socket error');
        break;
      case 'close':
        this.closed = true;
        this.closeListener?.(event.code ?? 1000, event.reason ?? '');
        break;
    }
  }
}
