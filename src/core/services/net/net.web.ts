import { invoke, Channel } from '@tauri-apps/api/core';
import type { NetSocketOptions } from 'argus-net';

import { DISCOVERY_TIMEOUT_MS, NET_TRUST_KEYS } from '@/shared/constants';
import type { IArgusNetService, IArgusSocket } from '@/core/interfaces';
import {
  clearInstance,
  isPaired,
  loadInstance,
  rememberInstanceAddress,
  rememberRoute,
  savePairingMetadata,
  saveRemote,
  toNetError,
} from './net-persistence';
import { NetRouteKeeper } from './net-route-probe';
import { lanServiceUrl, mayRediscover, relocatedInstance, rerouted, SERVER_IDENTITY_PATH } from './net-routes';
import { withDeviceCredential } from './device-credential';
import type {
  NetAdoptInput,
  NetDiscovery,
  NetHttpRequest,
  NetHttpResult,
  NetPairInput,
  NetPairedInstance,
  NetPairing,
  NetPin,
  NetRemoteProfile,
  NetRouteChoice,
} from '@/core/types';

const ignoreClosed = (): void => undefined;

class WebArgusNetService implements IArgusNetService {
  private rediscovery: Promise<boolean> | null = null;
  private lastRediscoveryFailureAt = 0;
  private readonly routes = new NetRouteKeeper(
    (url) => this.reach(url),
    () => this.settledRediscovery()
  );

  async discover(timeoutMs: number = DISCOVERY_TIMEOUT_MS): Promise<NetDiscovery> {
    try {
      return await invoke<NetDiscovery>('argus_discover', { timeoutMs });
    } catch (error) {
      throw toNetError(error, 'DISCOVERY_NOT_FOUND');
    }
  }

  async pair(input: NetPairInput): Promise<NetPairing> {
    const { host, ip, port, code, routes, expect } = input;
    try {
      const pairing = await invoke<NetPairing>('argus_pair', { host, ip, port, code, expect: expect ?? null });
      await savePairingMetadata({ pairing, host, ip, routes });
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
          headers: withDeviceCredential(options.headers),
          body: options.body ?? '',
          files: options.files ?? [],
        },
      });
    } catch (error) {
      throw toNetError(error, 'NETWORK_ERROR');
    }
  }

  async requestPinned(_options: NetHttpRequest, _pin: NetPin): Promise<NetHttpResult> {
    throw toNetError(
      new Error('NOT_SUPPORTED|Invitation enrollment is available on mobile devices'),
      'NETWORK_ERROR',
    );
  }

  async openSocket(options: NetSocketOptions): Promise<IArgusSocket> {
    try {
      return await this.openSocketOnce(options);
    } catch (error) {
      if (!(await this.refreshAddress())) throw toNetError(error, 'NETWORK_ERROR');
      const target = await loadInstance();
      if (!target) throw toNetError(error, 'NETWORK_ERROR');
      try {
        return await this.openSocketOnce({ ...options, url: rerouted(options.url, target) });
      } catch (retryError) {
        throw toNetError(retryError, 'NETWORK_ERROR');
      }
    }
  }

  private async openSocketOnce(options: NetSocketOptions): Promise<IArgusSocket> {
    const socketId = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const socket = new TauriSocket(socketId);
    await socket.open(options);
    return socket;
  }

  async refreshAddress(): Promise<boolean> {
    const instance = await loadInstance();
    if (!instance) return false;
    if (await this.rediscover(instance.ip).catch(() => false)) {
      rememberRoute('lan');
      return true;
    }
    const choice = await this.routes.probe().catch(() => null);
    return choice !== null && choice.mode !== (instance.route ?? 'lan');
  }

  probeRoute(): Promise<NetRouteChoice | null> {
    return this.routes.probe();
  }

  private reach(url: string): Promise<NetHttpResult> {
    return invoke<NetHttpResult>('argus_request', {
      request: { url, method: 'GET', headers: {}, body: '', files: [] },
    });
  }

  async rememberRemote(remote: NetRemoteProfile): Promise<boolean> {
    return saveRemote(remote);
  }

  private async settledRediscovery(): Promise<void> {
    if (this.rediscovery) await this.rediscovery.catch(() => false);
  }

  private rediscover(currentIp: string): Promise<boolean> {
    if (this.rediscovery) return this.rediscovery;
    if (!mayRediscover(this.lastRediscoveryFailureAt, Date.now())) return Promise.resolve(false);
    const attempt = this.relocate(currentIp)
      .then((moved) => {
        if (!moved) this.lastRediscoveryFailureAt = Date.now();
        return moved;
      })
      .catch((error: unknown) => {
        this.lastRediscoveryFailureAt = Date.now();
        throw error;
      })
      .finally(() => {
        if (this.rediscovery === attempt) this.rediscovery = null;
      });
    this.rediscovery = attempt;
    return attempt;
  }

  private async relocate(currentIp: string): Promise<boolean> {
    const instance = await loadInstance();
    if (!instance || instance.ip !== currentIp) return false;
    let found: NetDiscovery;
    try {
      found = await this.discover();
    } catch {
      return false;
    }
    const candidate = relocatedInstance(instance, found);
    if (!candidate || !(await this.relocateTo(candidate))) return false;
    await rememberInstanceAddress({ ip: candidate.ip, routes: candidate.routes });
    return true;
  }

  private async relocateTo(candidate: NetPairedInstance): Promise<boolean> {
    try {
      await invoke<void>('argus_relocate', {
        url: lanServiceUrl(candidate, SERVER_IDENTITY_PATH),
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
    await this.routes.settled();
    return loadInstance();
  }

  async unpair(): Promise<void> {
    await clearInstance(NET_TRUST_KEYS);
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
          headers: withDeviceCredential(options.headers),
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
    if (this.closed) return;
    invoke('argus_socket_send_text', { socketId: this.socketId, message }).catch(ignoreClosed);
  }

  sendBinary(data: ArrayBuffer): void {
    if (this.closed) return;
    invoke('argus_socket_send_binary', data, {
      headers: { 'x-argus-socket-id': this.socketId },
    }).catch(ignoreClosed);
  }

  close(code = 1000, reason = ''): void {
    if (this.closed) return;
    this.closed = true;
    invoke('argus_socket_close', { socketId: this.socketId, code, reason }).catch(ignoreClosed);
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
