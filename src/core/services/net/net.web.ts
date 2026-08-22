import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { NetSocketOptions } from 'argus-net';

import { DISCOVERY_TIMEOUT_MS } from '@/shared/constants';
import type { IArgusNetService, IArgusSocket } from '@/core/interfaces';
import {
  clearInstance,
  isPaired,
  loadInstance,
  savePairing,
  toNetError,
} from './net-persistence';
import type {
  NetDiscovery,
  NetError,
  NetHttpRequest,
  NetHttpResult,
  NetPairedInstance,
  NetPairing,
} from '@/core/types';

class WebArgusNetService implements IArgusNetService {
  async discover(timeoutMs: number = DISCOVERY_TIMEOUT_MS): Promise<NetDiscovery> {
    try {
      return await invoke<NetDiscovery>('argus_discover', { timeoutMs });
    } catch (error) {
      throw toNetError(error, 'DISCOVERY_NOT_FOUND');
    }
  }

  async pair(host: string, ip: string, port: number, code: string): Promise<NetPairing> {
    try {
      const result = await invoke<NetPairing>('argus_pair', { host, ip, port, code });
      await savePairing(result, host, ip);
      return result;
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async request(options: NetHttpRequest): Promise<NetHttpResult> {
    const instance = await loadInstance();
    if (!instance) {
      throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    }

    try {
      return await invoke<NetHttpResult>('argus_request', {
        request: {
          url: options.url,
          method: options.method,
          headers: options.headers ?? {},
          body: options.body ?? '',
          files: options.files ?? [],
        },
        caPem: instance.caPem,
        allowedHost: instance.host,
        ip: instance.ip,
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
    const instance = await loadInstance();
    if (!instance) {
      throw { code: 'PAIRING_REQUIRED', message: 'Server is not paired yet' } as NetError;
    }

    const socketId = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const socket = new TauriSocket(socketId);
    await socket.open({
      ...options,
      caPem: instance.caPem,
      allowedHost: instance.host,
      ip: instance.ip,
    });
    return socket;
  }

  /** The browser reaches the server by name; there is no pinned address here. */
  async refreshAddress(): Promise<boolean> {
    return false;
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

type TauriSocketOpenOptions = NetSocketOptions & {
  caPem: string;
  allowedHost: string;
  ip: string;
};

type TauriSocketEvent = {
  kind: 'open' | 'message' | 'binary' | 'error' | 'close';
  message?: string;
  data?: string;
  code?: number;
  errorCode?: string;
  reason?: string;
};

class TauriSocket implements IArgusSocket {
  private readonly eventName: string;
  private unlisten: (() => void) | null = null;
  private opened = false;
  private closed = false;
  private queued: TauriSocketEvent[] = [];
  private openListener: (() => void) | null = null;
  private messageListener: IArgusSocket['onMessage'] = null;
  private errorListener: IArgusSocket['onError'] = null;
  private closeListener: IArgusSocket['onClose'] = null;

  constructor(private readonly socketId: string) {
    this.eventName = `argus://socket/${socketId}`;
  }

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

  async open(options: TauriSocketOpenOptions): Promise<void> {
    this.unlisten = await listen<TauriSocketEvent>(this.eventName, ({ payload }) => {
      this.receive(payload);
    });
    try {
      await invoke('argus_socket_open', {
        options: {
          socketId: this.socketId,
          url: options.url,
          headers: options.headers ?? {},
          caPem: options.caPem,
          allowedHost: options.allowedHost,
          ip: options.ip,
          connectTimeoutMs: options.connectTimeoutMs ?? 8000,
        },
      });
    } catch (error) {
      this.unlisten?.();
      this.unlisten = null;
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  sendText(message: string): void {
    void invoke('argus_socket_send_text', { socketId: this.socketId, message });
  }

  sendBinary(data: ArrayBuffer): void {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    void invoke('argus_socket_send_binary', {
      socketId: this.socketId,
      data: btoa(binary),
    });
  }

  close(code = 1000, reason = ''): void {
    if (this.closed) return;
    this.closed = true;
    void invoke('argus_socket_close', { socketId: this.socketId, code, reason });
    this.unlisten?.();
    this.unlisten = null;
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
        const binary = atob(event.data ?? '');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        this.messageListener?.(null, bytes.buffer);
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
