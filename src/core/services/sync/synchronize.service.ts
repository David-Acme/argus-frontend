import type { Model } from '@nozbe/watermelondb';
import { collection } from '@/core/database';
import { netService } from '@/core/services/net';
import { storageService } from '@/core/services/storage';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { useAuthStore as UseAuthStoreHook } from '@/core/stores/auth.store';
import {
  SYNC_CURSORS_PREFIX,
  SYNC_OPERATION,
  SYNC_WS_PATH,
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
} from '@/shared/constants';
import type { SyncCursors, SyncOperation, SyncTableKey, UserRole } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import type {
  IInitialInfo,
  ISocketEmitDto,
  ISynchronizedDto,
  ISynchronizedResponse,
  ISyncBodyDto,
  ISyncDeletedRow,
  ISyncResponseBody,
  IWsMessage,
  IArgusSocket,
} from '@/core/interfaces';
import { toDirtyRaw, toModelProps } from './entity-mappers';
import { parseAuthContext } from './auth-context';
import { chunkedBatch, existingByServerId } from './sync-db-utils';
import {
  SYNC_FIRST_CONFIG,
  SYNC_MAX_PAGES,
  SYNC_PAGE_DELAY_MS,
  SYNC_PAGE_SIZE,
  SYNC_RESPONSE_TIMEOUT_MS,
} from './sync-constants';
import { openSocket } from './sync-socket';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const WS_CONNECT_TIMEOUT_MS = 8000;

const secondsOf = (v: unknown): number => (v == null ? 0 : Number(v));

const devLog = (...args: unknown[]): void => {
  // eslint-disable-next-line no-console
  console.log('[sync]', ...args);
};

type AuthStoreApi = typeof UseAuthStoreHook;

type SessionActions = {
  refreshSession: () => Promise<boolean>;
  clearSession: () => Promise<void>;
  updateUser: (partial: { id?: number; name?: string; role?: UserRole; isActive?: boolean }) => void;
};

class SynchronizeService {
  private socket: IArgusSocket | null = null;
  private connecting: Promise<boolean> | null = null;
  private authStore: AuthStoreApi | null = null;
  private sessionActions: SessionActions | null = null;
  private bound = false;
  private manualClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;
  private activeSync: Promise<void> | null = null;
  private contextSync: Promise<void> | null = null;
  private lastSyncAt: number | null = null;
  private syncError: string | null = null;
  private pendingAdds: ISocketEmitDto[] = [];
  private pendingDeletes: ISocketEmitDto[] = [];
  private pendingResponseResolver: ((response: ISynchronizedResponse) => void) | null = null;
  private pendingResponseRejecter: ((error: Error) => void) | null = null;
  private requestEndTime = 0;
  private listeners = new Map<number, Set<(msg: ISocketEmitDto) => void>>();
  private typeListeners = new Map<string, Set<(payload: unknown) => void>>();
  private binaryListeners = new Set<(data: ArrayBuffer) => void>();
  private connectCallbacks = new Set<() => void>();
  private disconnectCallbacks = new Set<() => void>();

  get isSyncing(): boolean {
    return this.syncing;
  }

  get isSocketConnected(): boolean {
    return this.socket != null;
  }

  get lastSyncAtValue(): number | null {
    return this.lastSyncAt;
  }

  get syncErrorMessage(): string | null {
    return this.syncError;
  }

  /** Subscribes to the session store: signed-in connects, signed-out disconnects. Idempotent. */
  bind(store: AuthStoreApi, sessionActions: SessionActions): void {
    if (this.bound) {
      devLog('bind: skipped (already bound)');
      return;
    }
    this.bound = true;
    this.authStore = store;
    this.sessionActions = sessionActions;
    devLog('bind: subscribed, current status=', store.getState().status);
    store.subscribe((state, prev) => {
      if (state.status === 'signed-in' && prev.status !== 'signed-in') {
        devLog('bind: signed-in transition -> connect');
        void this.connect();
      }
      if (state.status === 'signed-out' && prev.status === 'signed-in') {
        devLog('bind: signed-out transition -> disconnect');
        this.disconnect();
      }
    });
    if (store.getState().status === 'signed-in') {
      devLog('bind: already signed-in -> connect');
      void this.connect();
    }
  }

  /**
   * Re-establishes the socket if needed and resolves only after the native
   * WebSocket handshake has fired onOpen. This prevents the first voice
   * command from being sent while the socket is still connecting.
   */
  async ensureConnected(): Promise<boolean> {
    // `socket` is assigned when the native object is created, before its
    // asynchronous onOpen callback. Reuse the in-flight promise first so a
    // caller cannot mistake a handshaking socket for a ready one.
    if (this.connecting) return this.connecting;
    if (this.socket) return true;
    if (!this.authStore || this.authStore.getState().status !== 'signed-in') {
      devLog('ensureConnected: aborted, status=', this.authStore?.getState().status);
      return false;
    }
    devLog('ensureConnected: socket down -> connect');
    return this.connect();
  }

  send(type: string, payload?: unknown): void {
    if (!this.socket) {
      devLog('send: DROPPED (socket down):', type);
      return;
    }
    this.socket.sendText(JSON.stringify({ type, payload }));
  }

  sendBinary(data: ArrayBuffer): void {
    if (!this.socket) {
      devLog('sendBinary: DROPPED (socket down), bytes=', data.byteLength);
      return;
    }
    this.socket.sendBinary(data);
  }

  on(operation: SyncOperation, listener: (msg: ISocketEmitDto) => void): () => void {
    const set = this.listeners.get(operation) ?? new Set();
    set.add(listener);
    this.listeners.set(operation, set);
    return () => set.delete(listener);
  }

  /** Listens for JSON messages by `type` string (voice, future channels) without a numeric operation. */
  onType(type: string, listener: (payload: unknown) => void): () => void {
    const set = this.typeListeners.get(type) ?? new Set();
    set.add(listener);
    this.typeListeners.set(type, set);
    return () => set.delete(listener);
  }

  onBinary(listener: (data: ArrayBuffer) => void): () => void {
    this.binaryListeners.add(listener);
    return () => this.binaryListeners.delete(listener);
  }

  onConnect(callback: () => void): () => void {
    this.connectCallbacks.add(callback);
    return () => this.connectCallbacks.delete(callback);
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectCallbacks.add(callback);
    return () => this.disconnectCallbacks.delete(callback);
  }

  async syncOnce(): Promise<void> {
    if (this.contextSync) return this.contextSync;
    return this.startSync();
  }

  private startSync(): Promise<void> {
    if (!this.socket) return Promise.resolve();
    if (this.activeSync) return this.activeSync;

    const activeSync = this.performSync().finally(() => {
      if (this.activeSync === activeSync) this.activeSync = null;
    });
    this.activeSync = activeSync;
    return activeSync;
  }

  private async performSync(): Promise<void> {
    this.syncing = true;
    this.syncError = null;
    this.requestEndTime = Math.floor(Date.now() / 1000);
    try {
      let complete = false;
      for (let page = 0; page < SYNC_MAX_PAGES; page++) {
        const response = await this.requestSync(this.buildDto());
        const more = await this.processResponse(response);
        if (!more) {
          complete = true;
          break;
        }
        await delay(SYNC_PAGE_DELAY_MS);
      }
      if (!complete) throw new Error('Synchronization page limit reached');
      this.lastSyncAt = Date.now();
    } catch (error) {
      this.syncError = error instanceof Error ? error.message : String(error);
    } finally {
      this.syncing = false;
      this.replayPending();
      this.requestEndTime = 0;
    }
  }

  disconnect(): void {
    this.manualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectPendingResponse(new Error('Socket disconnected'));
    this.socket?.close(1000, '');
    this.socket = null;
    this.reconnectAttempt = 0;
    this.disconnectCallbacks.forEach((cb) => cb());
  }

  private connect(): Promise<boolean> {
    if (this.connecting) return this.connecting;
    if (this.socket) return Promise.resolve(true);

    this.manualClose = false;
    const attempt = this.openConnection();
    const tracked = attempt.finally(() => {
      if (this.connecting === tracked) this.connecting = null;
    });
    this.connecting = tracked;
    return tracked;
  }

  private async openConnection(): Promise<boolean> {
    const { accessToken } = this.authStore?.getState() ?? { accessToken: null };
    let instance;
    try {
      instance = await netService.instance();
    } catch (reason) {
      devLog('connect: instance lookup failed', reason);
      this.scheduleReconnect();
      return false;
    }

    if (!accessToken || !instance) {
      devLog('connect: aborted (token?', Boolean(accessToken), 'instance?', Boolean(instance), ')');
      return false;
    }
    devLog('connect: opening', `wss://${instance.host}:${instance.port}${SYNC_WS_PATH}`);

    let socket: IArgusSocket;
    try {
      socket = await openSocket({
        url: `wss://${instance.host}:${instance.port}${SYNC_WS_PATH}`,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (reason) {
      devLog('connect: EXCEPTION', reason);
      const code = (reason as { code?: string })?.code;
      if (code === 'UNAUTHORIZED') {
        const refreshed = await this.sessionActions?.refreshSession();
        if (refreshed && !this.manualClose) {
          this.scheduleReconnect();
        } else {
          this.manualClose = true;
          await this.sessionActions?.clearSession();
        }
        return false;
      }
      this.scheduleReconnect();
      return false;
    }

    if (this.manualClose) {
      socket.close();
      return false;
    }

    this.socket = socket;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let closed = false;
      let opened = false;
      const timer = setTimeout(() => {
        devLog('connect: TIMEOUT');
        socket.close(1000, 'Connection timeout');
        handleClose(0, 'WebSocket connection timeout');
      }, WS_CONNECT_TIMEOUT_MS);

      const settle = (connected: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(connected);
      };

      const handleClose = (code: number, reason: string, reconnect = true): void => {
        if (closed) return;
        closed = true;
        devLog('connect: CLOSE', code, reason);
        if (this.socket === socket) this.socket = null;
        this.rejectPendingResponse(new Error(`Socket closed (${code}): ${reason}`));
        if (!opened) settle(false);
        if (reconnect && !this.manualClose) this.scheduleReconnect();
      };

      socket.onOpen = () => {
        if (this.manualClose) {
          socket.close();
          handleClose(1000, 'Connection cancelled');
          return;
        }
        opened = true;
        devLog('connect: OPEN');
        this.reconnectAttempt = 0;
        settle(true);
        this.connectCallbacks.forEach((cb) => cb());
      };
      socket.onMessage = (message, data) => {
        if (message != null) this.handleMessage(message);
        if (data != null) this.binaryListeners.forEach((cb) => cb(data));
      };
      socket.onError = (code, message) => {
        devLog('connect: ERROR', code, message);
        if (code === 'UNAUTHORIZED') {
          handleClose(401, message, false);
          void this.recoverUnauthorized();
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
    // The address may have moved while we were away: ask the transport to look
    // the server up again, so the next attempt is not against a dead lease.
    void netService.refreshAddress().catch(() => undefined);
    const wait = Math.min(WS_RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, WS_RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    devLog('reconnect scheduled in', wait, 'ms');
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, wait);
  }

  private handleMessage(raw: string): void {
    let msg: Partial<ISocketEmitDto> & Partial<IWsMessage>;
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    if (msg.type && msg.type.endsWith('_error')) {
      const error = new Error(
        typeof msg.payload === 'string' ? msg.payload : `Socket error: ${msg.type}`,
      );
      this.syncError = error.message;
      this.rejectPendingResponse(error);
      return;
    }

    if (msg.type) {
      this.typeListeners.get(msg.type)?.forEach((fn) => fn(msg.payload));
      return;
    }

    const operation = Number(msg.operation);
    if (!Number.isInteger(operation)) return;

    const emit = msg as ISocketEmitDto;
    this.listeners.get(operation)?.forEach((fn) => fn(emit));
    switch (operation) {
      case SYNC_OPERATION.InitialInfo:
        this.onInitialInfo(emit.info as IInitialInfo);
        break;
      case SYNC_OPERATION.Synchronize:
        this.pendingResponseResolver?.(emit.info as ISynchronizedResponse);
        this.pendingResponseResolver = null;
        this.pendingResponseRejecter = null;
        break;
      case SYNC_OPERATION.Add:
        this.onAdd(emit);
        break;
      case SYNC_OPERATION.Delete:
        this.onDelete(emit);
        break;
      case SYNC_OPERATION.AuthContextChanged:
        this.onAuthContextChanged(emit.info);
        break;
    }
  }

  private onInitialInfo(info: IInitialInfo): void {
    if (this.authStore?.getState().status !== 'signed-in') {
      void this.sessionActions?.clearSession();
      return;
    }
    this.sessionActions?.updateUser({ id: info.id, role: info.role, isActive: info.isActive });
    void this.syncOnce();
  }

  private onAuthContextChanged(info: unknown): void {
    const currentUser = this.authStore?.getState().user;
    if (!currentUser) return;

    const context = parseAuthContext(info, currentUser.id);
    if (!context) return;

    this.sessionActions?.updateUser(context.user);
    if (!context.user.isActive) {
      void this.sessionActions?.clearSession();
      return;
    }
    if (context.requiresResync) this.startContextResync();
  }

  private startContextResync(): void {
    if (this.contextSync) return;

    const contextSync = (async () => {
      await this.activeSync;
      await this.clearSyncedRows();
      storageService.remove(this.cursorKey());
      viewCacheService.clear();
      await this.startSync();
    })()
      .catch((error) => {
        this.syncError = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        if (this.contextSync === contextSync) this.contextSync = null;
      });
    this.contextSync = contextSync;
  }

  private async clearSyncedRows(): Promise<void> {
    for (const key of SYNC_TABLE_KEYS) {
      const records = await collection(key).query().fetch();
      await chunkedBatch(records.map((record) => () => record.prepareDestroyPermanently()));
    }
  }

  private onAdd(msg: ISocketEmitDto): void {
    if (this.syncing) {
      this.pendingAdds.push(msg);
      return;
    }
    const key = this.syncKey(msg.option);
    if (key) void this.applyCreated(key, [msg.info as Record<string, unknown>]);
  }

  private onDelete(msg: ISocketEmitDto): void {
    if (this.syncing) {
      this.pendingDeletes.push(msg);
      return;
    }
    const key = this.syncKey(msg.option);
    if (key) void this.applyDeleted(key, [msg.info as ISyncDeletedRow]);
  }

  private syncKey(option: string): SyncTableKey | null {
    return SYNC_TABLE_KEYS.includes(option as SyncTableKey) ? (option as SyncTableKey) : null;
  }

  private replayPending(): void {
    const adds = this.pendingAdds.splice(0);
    const deletes = this.pendingDeletes.splice(0);
    for (const msg of adds) this.onAdd(msg);
    for (const msg of deletes) this.onDelete(msg);
  }

  private requestSync(dto: ISynchronizedDto): Promise<ISynchronizedResponse> {
    if (!this.socket) return Promise.reject(new Error('Socket is not connected'));
    if (this.pendingResponseResolver) {
      return Promise.reject(new Error('A sync request is already pending'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponseResolver = null;
        this.pendingResponseRejecter = null;
        reject(new Error('Synchronization response timeout'));
      }, SYNC_RESPONSE_TIMEOUT_MS);
      this.pendingResponseResolver = (response) => {
        clearTimeout(timer);
        resolve(response);
      };
      this.pendingResponseRejecter = (error) => {
        clearTimeout(timer);
        reject(error);
      };
      try {
        this.send('sync', dto);
      } catch (error) {
        this.rejectPendingResponse(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private rejectPendingResponse(error: Error): void {
    const reject = this.pendingResponseRejecter;
    this.pendingResponseResolver = null;
    this.pendingResponseRejecter = null;
    reject?.(error);
  }

  private async recoverUnauthorized(): Promise<void> {
    const refreshed = await this.sessionActions?.refreshSession();
    if (refreshed && !this.manualClose) {
      this.scheduleReconnect();
      return;
    }
    this.manualClose = true;
    await this.sessionActions?.clearSession();
  }

  private async processResponse(resp: ISynchronizedResponse): Promise<boolean> {
    let more = false;
    for (const key of SYNC_TABLE_KEYS) {
      const body = resp[key];
      if (!body) continue;
      const created = Array.isArray(body.created)
        ? (body.created as Record<string, unknown>[])
        : [];
      const deleted = Array.isArray(body.deleted) ? body.deleted : [];
      await this.applyCreated(key, created);
      await this.applyDeleted(key, deleted);
      this.advanceCursor(key, body);
      if (created.length >= SYNC_PAGE_SIZE || deleted.length >= SYNC_PAGE_SIZE) more = true;
    }
    return more;
  }

  private async applyCreated(
    key: SyncTableKey,
    rows: Record<string, unknown>[],
  ): Promise<void> {
    if (rows.length === 0) return;
    const ids = rows.map((row) => String(row.id));
    const existing = await existingByServerId(key, ids);
    const ops: (() => Model)[] = [];
    for (const row of rows) {
      const record = existing.get(String(row.id));
      if (record) {
        ops.push(() => record.prepareUpdate((r) => Object.assign(r, toModelProps(key, row))));
      } else {
        ops.push(() => collection(key).prepareCreateFromDirtyRaw(toDirtyRaw(key, row)));
      }
    }
    await chunkedBatch(ops);

    const { user } = this.authStore?.getState() ?? { user: null };
    if (key === 'user' && user) {
      const mine = rows.find((row) => String(row.id) === String(user.id));
      if (mine) {
        this.sessionActions?.updateUser({
          name: String(mine.name ?? ''),
          role: (mine.role as UserRole) ?? 'guest',
          isActive: Boolean(mine.isActive),
        });
      }
    }
  }

  private async applyDeleted(key: SyncTableKey, rows: ISyncDeletedRow[]): Promise<void> {
    if (rows.length === 0) return;
    const existing = await existingByServerId(
      key,
      rows.map((row) => String(row.id)),
    );
    const ops: (() => Model)[] = [];
    existing.forEach((record) => ops.push(() => record.prepareDestroyPermanently()));
    await chunkedBatch(ops);
  }

  private advanceCursor(key: SyncTableKey, body: ISyncResponseBody): void {
    const cursors = this.loadCursors();
    const current = cursors[key] ?? {};
    const createdRows = body.created as Record<string, unknown>[];
    const createdPosition = this.maxPosition(
      createdRows,
      'syncAt',
      body.lastSyncDate?.created,
      body.lastSyncDate?.createdId,
    );
    const deletedPosition = this.maxPosition(
      body.deleted as unknown as Record<string, unknown>[],
      'deletedAt',
      body.lastSyncDate?.deleted,
      body.lastSyncDate?.deletedId,
    );
    cursors[key] = {
      createdStart: createdPosition?.time ?? current.createdStart ?? this.requestEndTime,
      createdId: createdPosition?.id ?? current.createdId,
      deletedStart: deletedPosition?.time ?? current.deletedStart ?? this.requestEndTime,
      deletedId: deletedPosition?.id ?? current.deletedId,
    };
    this.saveCursors(cursors);
  }

  private maxPosition(
    rows: Record<string, unknown>[],
    timeField: 'syncAt' | 'deletedAt',
    fallbackTime?: number | null,
    fallbackId?: number | string,
  ): { time: number; id?: number | string } | null {
    let result: { time: number; id?: number | string } | null = null;
    for (const row of rows) {
      const time = secondsOf(timeField === 'syncAt' ? row.syncAt ?? row.createdAt : row.deletedAt);
      if (!time) continue;
      const id = row.id as number | string | undefined;
      if (!result || time > result.time || (time === result.time && this.compareIds(id, result.id) > 0)) {
        result = { time, id };
      }
    }
    if (result) return result;
    if (fallbackTime) return { time: fallbackTime, id: fallbackId };
    return null;
  }

  private compareIds(left?: number | string, right?: number | string): number {
    if (left == null) return right == null ? 0 : -1;
    if (right == null) return 1;
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
    return String(left).localeCompare(String(right));
  }

  private buildDto(): ISynchronizedDto {
    if (!this.requestEndTime) this.requestEndTime = Math.floor(Date.now() / 1000);
    const cursors = this.loadCursors();
    const dto: ISynchronizedDto = {};
    for (const key of SYNC_TABLE_KEYS) {
      const cursor = cursors[key];
      const hasCreated = cursor?.createdStart != null;
      const hasDeleted = cursor?.deletedStart != null;
      if (!hasCreated && !hasDeleted) {
        dto[key] = SYNC_FIRST_CONFIG[key];
        continue;
      }
      const body: ISyncBodyDto = {};
      if (hasCreated) {
        body.created = {
          startTime: cursor.createdStart,
          startId: cursor.createdId,
          endTime: this.requestEndTime,
        };
      }
      if (hasDeleted && key !== 'notification') {
        body.deleted = {
          startTime: cursor.deletedStart,
          startId: cursor.deletedId,
          endTime: this.requestEndTime,
        };
      }
      body.requiredCreate = true;
      if (key !== 'notification') body.requiredDeleted = true;
      dto[key] = body;
    }
    return dto;
  }

  private cursorKey(): string {
    return SYNC_CURSORS_PREFIX + (this.authStore?.getState().user?.id ?? '');
  }

  private loadCursors(): SyncCursors {
    return storageService.getObject<SyncCursors>(this.cursorKey()) ?? {};
  }

  private saveCursors(cursors: SyncCursors): void {
    storageService.setObject(this.cursorKey(), cursors);
  }
}

export const synchronizeService = new SynchronizeService();
