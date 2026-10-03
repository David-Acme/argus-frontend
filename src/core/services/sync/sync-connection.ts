import type { IArgusSocket } from '@/core/interfaces';
import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import type { SessionRefreshOutcome } from '@/core/types';
import { SYNC_WS_CONNECT_TIMEOUT_MS, SYNC_WS_PATH } from '@/shared/constants';
import { backoffDelay } from './sync-backoff';
import { openSocket } from './sync-socket';

export type SyncConnectionHooks = {
  accessToken: () => string | null | undefined;
  isClearing: () => boolean;
  onAttach: () => void;
  onLost: (reason: Error) => void;
  onText: (raw: string) => void;
  onBinary: (data: ArrayBuffer) => void;
  refreshSession: () => Promise<SessionRefreshOutcome> | undefined;
  clearSession: () => Promise<void> | undefined;
};

export class SyncConnection {
  private socket: IArgusSocket | null = null;
  private generation = 0;
  private abandonCurrent: ((reason: string) => void) | null = null;
  private connected = false;
  private connecting: Promise<boolean> | null = null;
  private manualClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectCallbacks = new Set<() => void>();
  private disconnectCallbacks = new Set<() => void>();

  constructor(private readonly hooks: SyncConnectionHooks) {}

  get isConnected(): boolean {
    return this.connected;
  }

  get hasSocket(): boolean {
    return this.socket != null;
  }

  get attempt(): Promise<boolean> | null {
    return this.connecting;
  }

  get isManuallyClosed(): boolean {
    return this.manualClose;
  }

  onConnect(callback: () => void): () => void {
    this.connectCallbacks.add(callback);
    return () => this.connectCallbacks.delete(callback);
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectCallbacks.add(callback);
    return () => this.disconnectCallbacks.delete(callback);
  }

  sendText(text: string): void {
    this.socket?.sendText(text);
  }

  sendBinary(data: ArrayBuffer): void {
    this.socket?.sendBinary(data);
  }

  async connect(): Promise<boolean> {
    if (this.hooks.isClearing()) return false;
    if (this.connecting) return this.connecting;
    if (this.socket) return true;

    this.manualClose = false;
    const attempt = this.openConnection();
    const tracked = attempt.finally(() => {
      if (this.connecting === tracked) this.connecting = null;
    });
    this.connecting = tracked;
    return tracked;
  }

  halt(): void {
    this.manualClose = true;
    this.generation += 1;
    this.connecting = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  recycle(reason: string): void {
    this.abandonCurrent?.(reason);
  }

  release(): void {
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, '');
    this.reconnectAttempt = 0;
  }

  setConnected(next: boolean): void {
    if (this.connected === next) return;
    this.connected = next;
    (next ? this.connectCallbacks : this.disconnectCallbacks).forEach((cb) => cb());
  }

  private async openConnection(): Promise<boolean> {
    const generation = this.generation;
    const accessToken = this.hooks.accessToken() ?? null;
    let instance;
    try {
      instance = await netService.instance();
    } catch {
      this.scheduleReconnect();
      return false;
    }

    if (!accessToken || !instance) return false;

    let socket: IArgusSocket;
    try {
      socket = await openSocket({
        url: serviceUrl(instance, SYNC_WS_PATH, 'wss'),
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (reason) {
      if (generation !== this.generation) return false;
      const code = (reason as { code?: string })?.code;
      if (code === 'UNAUTHORIZED') {
        await this.recoverUnauthorized(accessToken);
        return false;
      }
      this.scheduleReconnect();
      return false;
    }

    if (generation !== this.generation || this.manualClose || this.hooks.isClearing()) {
      socket.close();
      return false;
    }

    this.socket = socket;
    this.hooks.onAttach();
    return this.watch(socket, accessToken);
  }

  private watch(socket: IArgusSocket, accessToken: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let closed = false;
      let opened = false;
      const timer = setTimeout(() => {
        socket.close(1000, 'Connection timeout');
        handleClose(0, 'WebSocket connection timeout');
      }, SYNC_WS_CONNECT_TIMEOUT_MS);

      const settle = (connected: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(connected);
      };

      const handleClose = (code: number, reason: string, reconnect = true): void => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        if (this.abandonCurrent === abandon) this.abandonCurrent = null;
        if (this.socket === socket) {
          this.socket = null;
          this.hooks.onLost(new Error(`Socket closed (${code}): ${reason}`));
          this.setConnected(false);
        }
        if (!opened) settle(false);
        if (reconnect && !this.manualClose) this.scheduleReconnect();
      };

      const abandon = (reason: string): void => {
        socket.close(4000, reason);
        handleClose(4000, reason);
      };
      this.abandonCurrent = abandon;

      socket.onOpen = () => {
        if (this.manualClose || this.hooks.isClearing()) {
          socket.close();
          handleClose(1000, 'Connection cancelled', false);
          return;
        }
        opened = true;
        this.reconnectAttempt = 0;
        settle(true);
        this.setConnected(true);
      };
      socket.onMessage = (message, data) => {
        if (this.socket !== socket) return;
        if (message != null) this.hooks.onText(message);
        if (data != null) this.hooks.onBinary(data);
      };
      socket.onError = (code, message) => {
        if (code === 'UNAUTHORIZED') {
          handleClose(401, message, false);
          void this.recoverUnauthorized(accessToken);
          return;
        }
        handleClose(0, message);
      };
      socket.onClose = (code, reason) => handleClose(code, reason);
    });
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;
    if (this.reconnectTimer) return;
    void netService.refreshAddress().catch(() => undefined);
    const wait = backoffDelay(this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, wait);
  }

  private async recoverUnauthorized(failedToken: string): Promise<void> {
    const current = this.hooks.accessToken() ?? null;
    const outcome = current !== null && current !== failedToken ? 'refreshed' : await this.hooks.refreshSession();
    if (outcome === 'rejected') {
      this.manualClose = true;
      await this.hooks.clearSession();
      return;
    }
    if (!this.manualClose) this.scheduleReconnect();
  }
}
