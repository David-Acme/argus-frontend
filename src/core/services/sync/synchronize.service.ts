import type { Model } from '@nozbe/watermelondb';
import { collection, database } from '@/core/database';
import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { storageService } from '@/core/services/storage';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { useAuthStore as UseAuthStoreHook } from '@/core/stores/auth.store';
import {
  SYNC_CURSORS_PREFIX,
  SYNC_AUDIT_CURSORS_PREFIX,
  SYNC_AUDIT_REQUEST_TYPE,
  SYNC_OPERATION,
  SYNC_WS_PATH,
  SYNC_WS_CONNECT_TIMEOUT_MS,
  WS_RECONNECT_BASE_MS,
  WS_RECONNECT_MAX_MS,
  SYNC_PAGE_SIZE,
  SYNC_PAGE_DELAY_MS,
  SYNC_MAX_PAGES,
  SYNC_RESPONSE_TIMEOUT_MS,
  VOICE_ERROR_TYPE,
} from '@/shared/constants';
import type {
  AuditLogCursor,
  AuditLogCursors,
  AuditLogRequest,
  AuditLogScope,
  SessionRefreshOutcome,
  SyncCursors,
  SyncOperation,
  SyncTableCursor,
  SyncTableKey,
  UserRole,
} from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import type {
  IInitialInfo,
  ISocketEmitDto,
  ISynchronizedDto,
  ISynchronizedResponse,
  ISyncBodyDto,
  ISyncDeletedRow,
  ISyncRangeDto,
  IWsMessage,
  IArgusSocket,
  IAuditLogEntry,
  IAuditLogSyncResponse,
} from '@/core/interfaces';
import { auditLogProcessorService } from './audit-log-processor.service';
import { buildAuditRequest } from './audit-log-cursor';
import { toBool, toDirtyRaw, toModelProps } from './entity-mappers';
import { parseAuthContext } from './auth-context';
import {
  batchPrepared,
  destroyAllRows,
  existingByServerId,
  type PreparedOperation,
} from './sync-db-utils';
import {
  SYNC_CATCH_UP_DELAY_MS,
  SYNC_ERROR_SUFFIX,
  SYNC_LIVE_BUFFER_LIMIT,
  SYNC_PROJECTION_VERSION,
  SYNC_REQUEST_TYPE,
  SYNC_STATUS_REPLICA_TOO_OLD,
  SYNC_STATUS_UNAUTHORIZED,
  SYNC_TABLES_WITHOUT_DELETIONS,
  SYNC_VOICE_PREFIX,
} from './sync-constants';
import { SyncRequestError, isSyncRequestError } from './sync-request-error';
import { openSocket } from './sync-socket';

const AUDIT_SCOPES: readonly AuditLogScope[] = ['global', 'user'];

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const secondsOf = (v: unknown): number => {
  const value = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(value) ? Math.floor(value) : 0;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const compareIds = (left?: number | string, right?: number | string): number => {
  if (left == null) return right == null ? 0 : -1;
  if (right == null) return 1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber;
  return String(left).localeCompare(String(right));
};

const rangeFrom = (start?: number, id?: number | string): ISyncRangeDto | undefined => {
  const startTime = secondsOf(start);
  if (startTime <= 0) return undefined;
  const startId = Number(id);
  return id != null && Number.isSafeInteger(startId) ? { startTime, startId } : { startTime };
};

const withoutCreatedCursor = (cursor: SyncTableCursor | undefined): SyncTableCursor => ({
  deletedStart: cursor?.deletedStart,
  deletedId: cursor?.deletedId,
  deletedBaseline: cursor?.deletedBaseline,
  projection: SYNC_PROJECTION_VERSION,
});

const emptyAuditHigh = (): Record<AuditLogScope, number> => ({ global: 0, user: 0 });

const auditScopeOfRequest = (requestType: string): AuditLogScope | null => {
  if (requestType === SYNC_AUDIT_REQUEST_TYPE.global) return 'global';
  if (requestType === SYNC_AUDIT_REQUEST_TYPE.user) return 'user';
  return null;
};

type AuthStoreApi = typeof UseAuthStoreHook;

type SessionActions = {
  refreshSession: () => Promise<SessionRefreshOutcome>;
  clearSession: () => Promise<void>;
  updateUser: (partial: {
    id?: number;
    name?: string;
    role?: UserRole;
    isActive?: boolean;
  }) => void;
};

type PendingRequest<T> = {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

type SyncPosition = { time: number; id?: number | string };

type CreatedRows = Map<SyncTableKey, Record<string, unknown>[]>;

type DeletedRows = Map<SyncTableKey, ISyncDeletedRow[]>;

type CreateMode = 'upsert' | 'insert';

type ErrorFrame = Partial<IWsMessage> & { status?: unknown };

class SynchronizeService {
  private socket: IArgusSocket | null = null;
  private connecting: Promise<boolean> | null = null;
  private authStore: AuthStoreApi | null = null;
  private sessionActions: SessionActions | null = null;
  private bound = false;
  private manualClose = false;
  private clearing = false;
  private clearChain: Promise<void> = Promise.resolve();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncRetryAttempt = 0;
  private syncing = false;
  private activeSync: Promise<void> | null = null;
  private contextSync: Promise<void> | null = null;
  private lastSyncAt: number | null = null;
  private syncError: string | null = null;
  private projectionEpoch = 0;
  private liveReady = false;
  private liveOverflow = false;
  private catchUpRequested = false;
  private pendingEvents: ISocketEmitDto[] = [];
  private liveQueue: ISocketEmitDto[] = [];
  private liveFlushScheduled = false;
  private liveApply: Promise<void> = Promise.resolve();
  private liveAuditHigh = emptyAuditHigh();
  private pendingResponse: PendingRequest<ISynchronizedResponse> | null = null;
  private pendingAudit = new Map<AuditLogScope, PendingRequest<IAuditLogSyncResponse>>();
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

  bind(store: AuthStoreApi, sessionActions: SessionActions): void {
    if (this.bound) return;
    this.bound = true;
    this.authStore = store;
    this.sessionActions = sessionActions;
    store.subscribe((state, prev) => {
      if (state.status === 'signed-in' && prev.status !== 'signed-in') void this.connect();
      if (state.status === 'signed-out' && prev.status === 'signed-in') this.disconnect();
    });
    if (store.getState().status === 'signed-in') void this.connect();
  }

  async ensureConnected(): Promise<boolean> {
    if (this.connecting) return this.connecting;
    if (this.socket) return true;
    if (!this.authStore || this.authStore.getState().status !== 'signed-in') return false;
    return this.connect();
  }

  send(type: string, payload?: unknown): void {
    this.socket?.sendText(JSON.stringify({ type, payload }));
  }

  sendBinary(data: ArrayBuffer): void {
    this.socket?.sendBinary(data);
  }

  on(operation: SyncOperation, listener: (msg: ISocketEmitDto) => void): () => void {
    const set = this.listeners.get(operation) ?? new Set();
    set.add(listener);
    this.listeners.set(operation, set);
    return () => set.delete(listener);
  }

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

  clearLocalProjection(userId: number | string | null): Promise<void> {
    this.disconnect();
    this.clearing = true;
    this.resetLiveState();
    const clear = this.clearChain
      .then(async () => {
        await Promise.allSettled([this.activeSync, this.contextSync, this.liveApply]);
        await destroyAllRows(SYNC_TABLE_KEYS);
        const scope = userId == null ? '' : String(userId);
        storageService.remove(SYNC_CURSORS_PREFIX + scope);
        storageService.remove(SYNC_AUDIT_CURSORS_PREFIX + scope);
        viewCacheService.clear();
      })
      .finally(() => {
        if (this.clearChain === settled) this.clearing = false;
      });
    const settled = clear.catch(() => undefined);
    this.clearChain = settled;
    return clear;
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearTimers();
    this.rejectPendingRequests(new Error('Socket disconnected'));
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000, '');
    this.reconnectAttempt = 0;
    this.pauseLive();
    this.disconnectCallbacks.forEach((cb) => cb());
  }

  private resetLiveState(): void {
    this.projectionEpoch += 1;
    this.pauseLive();
    this.liveQueue = [];
    this.liveAuditHigh = emptyAuditHigh();
    this.catchUpRequested = false;
    this.syncRetryAttempt = 0;
  }

  private pauseLive(): void {
    this.liveReady = false;
    this.liveOverflow = false;
    this.pendingEvents = [];
  }

  private clearTimers(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
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

  private scheduleSync(delayMs: number): void {
    if (this.syncTimer || this.manualClose) return;
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      void this.syncOnce();
    }, delayMs);
  }

  private requestCatchUp(): void {
    if (this.syncing) {
      this.catchUpRequested = true;
      return;
    }
    this.scheduleSync(SYNC_CATCH_UP_DELAY_MS);
  }

  private async performSync(): Promise<void> {
    const epoch = this.projectionEpoch;
    this.syncing = true;
    this.syncError = null;
    this.catchUpRequested = false;
    this.pauseLive();
    try {
      await this.runSync(epoch);
      this.lastSyncAt = Date.now();
      this.syncRetryAttempt = 0;
      this.syncing = false;
      if (epoch !== this.projectionEpoch) return;
      if (this.liveOverflow) {
        this.pauseLive();
        this.scheduleSync(0);
        return;
      }
      this.liveReady = true;
      const buffered = this.pendingEvents.splice(0);
      if (buffered.length > 0) this.enqueueLive(buffered);
      if (this.catchUpRequested) {
        this.catchUpRequested = false;
        this.scheduleSync(SYNC_CATCH_UP_DELAY_MS);
      }
    } catch (error) {
      this.syncError = errorMessage(error);
      this.pauseLive();
      if (epoch === this.projectionEpoch && !isSyncRequestError(error, SYNC_STATUS_UNAUTHORIZED)) {
        const wait = Math.min(
          WS_RECONNECT_BASE_MS * 2 ** this.syncRetryAttempt,
          WS_RECONNECT_MAX_MS
        );
        this.syncRetryAttempt += 1;
        this.scheduleSync(wait);
      }
    } finally {
      this.syncing = false;
    }
  }

  private async runSync(epoch: number): Promise<void> {
    const cursors = this.loadCursors();
    await this.ensureAuditBaselines(epoch);
    await this.ensureDeletedBaselines(cursors, epoch);
    await this.pageRows(cursors, epoch);
    const stale = await this.syncAuditLogs(epoch);
    if (stale.length === 0) return;

    for (const scope of stale) await this.resetAuditBaseline(scope, epoch);
    for (const key of SYNC_TABLE_KEYS) cursors[key] = withoutCreatedCursor(cursors[key]);
    this.saveCursors(cursors);
    await this.pageRows(cursors, epoch);
    const stillStale = await this.syncAuditLogs(epoch);
    if (stillStale.length > 0) throw new Error('Audit history is older than the retention window');
  }

  private assertEpoch(epoch: number): void {
    if (epoch !== this.projectionEpoch) throw new Error('Synchronization cancelled');
  }

  private async connect(): Promise<boolean> {
    if (this.clearing) return false;
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

  private async openConnection(): Promise<boolean> {
    const { accessToken } = this.authStore?.getState() ?? { accessToken: null };
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
      const code = (reason as { code?: string })?.code;
      if (code === 'UNAUTHORIZED') {
        await this.recoverUnauthorized();
        return false;
      }
      this.scheduleReconnect();
      return false;
    }

    if (this.manualClose || this.clearing) {
      socket.close();
      return false;
    }

    this.socket = socket;
    this.pauseLive();
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
        if (this.socket === socket) {
          this.socket = null;
          this.pauseLive();
          this.rejectPendingRequests(new Error(`Socket closed (${code}): ${reason}`));
        }
        if (!opened) settle(false);
        if (reconnect && !this.manualClose) this.scheduleReconnect();
      };

      socket.onOpen = () => {
        if (this.manualClose || this.clearing) {
          socket.close();
          handleClose(1000, 'Connection cancelled', false);
          return;
        }
        opened = true;
        this.reconnectAttempt = 0;
        settle(true);
        this.connectCallbacks.forEach((cb) => cb());
      };
      socket.onMessage = (message, data) => {
        if (this.socket !== socket) return;
        if (message != null) this.handleMessage(message);
        if (data != null) this.binaryListeners.forEach((cb) => cb(data));
      };
      socket.onError = (code, message) => {
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
    void netService.refreshAddress().catch(() => undefined);
    const wait = Math.min(WS_RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, WS_RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, wait);
  }

  private handleMessage(raw: string): void {
    let msg: Partial<ISocketEmitDto> & ErrorFrame;
    try {
      msg = JSON.parse(raw) as typeof msg;
    } catch {
      return;
    }
    if (typeof msg.type === 'string' && msg.type.endsWith(SYNC_ERROR_SUFFIX)) {
      this.routeError(msg.type, msg);
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
        this.resolvePendingResponse(emit.info as ISynchronizedResponse);
        break;
      case SYNC_OPERATION.SynchronizeAuditLog:
        this.resolveAuditResponse('global', emit.info as IAuditLogSyncResponse);
        break;
      case SYNC_OPERATION.SynchronizeUserAuditLog:
        this.resolveAuditResponse('user', emit.info as IAuditLogSyncResponse);
        break;
      case SYNC_OPERATION.Add:
      case SYNC_OPERATION.Delete:
      case SYNC_OPERATION.Log:
        this.onLiveFrame(emit);
        break;
      case SYNC_OPERATION.AuthContextChanged:
        this.onAuthContextChanged(emit.info);
        break;
    }
  }

  private routeError(type: string, frame: ErrorFrame): void {
    const requestType = type.slice(0, -SYNC_ERROR_SUFFIX.length);
    const status = Number(frame.status) || 0;
    const message =
      typeof frame.error === 'string'
        ? frame.error
        : typeof frame.payload === 'string'
          ? frame.payload
          : `Socket error: ${type}`;

    if (requestType === SYNC_REQUEST_TYPE) {
      this.rejectPendingResponse(new SyncRequestError(message, status));
      return;
    }
    const scope = auditScopeOfRequest(requestType);
    if (scope) {
      this.rejectAuditResponse(scope, new SyncRequestError(message, status));
      return;
    }
    const payload = { status, error: message };
    this.typeListeners.get(type)?.forEach((fn) => fn(payload));
    if (requestType.startsWith(SYNC_VOICE_PREFIX)) {
      this.typeListeners.get(VOICE_ERROR_TYPE)?.forEach((fn) => fn(payload));
    }
  }

  private onInitialInfo(info: IInitialInfo): void {
    if (this.authStore?.getState().status !== 'signed-in') {
      void this.sessionActions?.clearSession();
      return;
    }
    const previousRole = this.authStore.getState().user?.role;
    this.sessionActions?.updateUser({ id: info.id, role: info.role, isActive: info.isActive });
    if (previousRole && previousRole !== info.role) {
      this.startContextResync();
      return;
    }
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
    this.resetLiveState();
    const epoch = this.projectionEpoch;

    const contextSync = (async () => {
      await Promise.allSettled([this.activeSync, this.liveApply]);
      if (epoch !== this.projectionEpoch) return;
      await destroyAllRows(SYNC_TABLE_KEYS);
      if (epoch !== this.projectionEpoch) return;
      storageService.remove(this.cursorKey());
      storageService.remove(this.auditCursorKey());
      viewCacheService.clear();
      await this.startSync();
    })()
      .catch((error: unknown) => {
        this.syncError = errorMessage(error);
      })
      .finally(() => {
        if (this.contextSync === contextSync) this.contextSync = null;
      });
    this.contextSync = contextSync;
  }

  private onLiveFrame(msg: ISocketEmitDto): void {
    if (this.liveReady) {
      this.enqueueLive([msg]);
      return;
    }
    if (this.liveOverflow) return;
    if (this.pendingEvents.length >= SYNC_LIVE_BUFFER_LIMIT) {
      this.pendingEvents = [];
      this.liveOverflow = true;
      return;
    }
    this.pendingEvents.push(msg);
  }

  private enqueueLive(events: ISocketEmitDto[]): void {
    if (this.liveQueue.length + events.length > SYNC_LIVE_BUFFER_LIMIT) {
      this.liveQueue = [];
      this.pauseLive();
      this.scheduleSync(0);
      return;
    }
    this.liveQueue.push(...events);
    if (this.liveFlushScheduled) return;
    this.liveFlushScheduled = true;
    setTimeout(() => this.flushLive(), 0);
  }

  private flushLive(): void {
    this.liveFlushScheduled = false;
    const events = this.liveQueue.splice(0);
    if (events.length === 0) return;
    const epoch = this.projectionEpoch;
    this.liveApply = this.liveApply
      .then(() => this.applyLive(events, epoch))
      .catch((error: unknown) => {
        this.syncError = errorMessage(error);
        if (epoch === this.projectionEpoch) this.requestCatchUp();
      });
  }

  private async applyLive(events: ISocketEmitDto[], epoch: number): Promise<void> {
    if (epoch !== this.projectionEpoch) return;
    const created: CreatedRows = new Map();
    const deleted: DeletedRows = new Map();
    const logs: Record<AuditLogScope, IAuditLogEntry[]> = { global: [], user: [] };

    for (const event of events) {
      if (event.operation === SYNC_OPERATION.Log) {
        logs[event.option === 'user_audit_log' ? 'user' : 'global'].push(
          event.info as IAuditLogEntry
        );
        continue;
      }
      const key = this.syncKey(event.option);
      if (!key) continue;
      if (event.operation === SYNC_OPERATION.Add) {
        const rows = created.get(key) ?? [];
        rows.push(event.info as Record<string, unknown>);
        created.set(key, rows);
      } else if (event.operation === SYNC_OPERATION.Delete) {
        const rows = deleted.get(key) ?? [];
        rows.push(event.info as ISyncDeletedRow);
        deleted.set(key, rows);
      }
    }

    const entries = this.freshLiveAuditEntries(logs);
    let missing = 0;
    await database.write(async () => {
      if (epoch !== this.projectionEpoch) return;
      await batchPrepared(await this.prepareRows(created, deleted, 'insert'));
      if (entries.length === 0) return;
      const prepared = await auditLogProcessorService.prepare(entries);
      await batchPrepared(prepared.operations);
      missing = prepared.missing.length;
    });
    if (epoch !== this.projectionEpoch) return;
    this.updateCurrentUserFromRows(created.get('user'));
    this.updateCurrentUserFromAudit(entries);
    if (missing > 0) this.requestCatchUp();
  }

  private freshLiveAuditEntries(logs: Record<AuditLogScope, IAuditLogEntry[]>): IAuditLogEntry[] {
    const cursors = this.loadAuditCursors();
    const fresh: IAuditLogEntry[] = [];
    for (const scope of AUDIT_SCOPES) {
      let floor = Math.max(cursors[scope]?.lastId ?? 0, this.liveAuditHigh[scope]);
      const ordered = [...logs[scope]].sort((left, right) => Number(left.id) - Number(right.id));
      for (const entry of ordered) {
        const id = Number(entry.id);
        if (!Number.isFinite(id) || id <= floor) continue;
        floor = id;
        fresh.push(entry);
      }
      this.liveAuditHigh[scope] = floor;
    }
    return fresh;
  }

  private syncKey(option: string): SyncTableKey | null {
    return SYNC_TABLE_KEYS.includes(option as SyncTableKey) ? (option as SyncTableKey) : null;
  }

  private requestSync(dto: ISynchronizedDto): Promise<ISynchronizedResponse> {
    if (!this.socket) return Promise.reject(new Error('Socket is not connected'));
    if (this.pendingResponse) return Promise.reject(new Error('A sync request is already pending'));

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingResponse = null;
        reject(new Error('Synchronization response timeout'));
      }, SYNC_RESPONSE_TIMEOUT_MS);
      this.pendingResponse = {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      try {
        this.send(SYNC_REQUEST_TYPE, dto);
      } catch (error) {
        this.rejectPendingResponse(new Error(errorMessage(error)));
      }
    });
  }

  private resolvePendingResponse(response: ISynchronizedResponse): void {
    const pending = this.pendingResponse;
    this.pendingResponse = null;
    pending?.resolve(response ?? {});
  }

  private rejectPendingResponse(error: Error): void {
    const pending = this.pendingResponse;
    this.pendingResponse = null;
    pending?.reject(error);
  }

  private requestAudit(
    scope: AuditLogScope,
    payload: AuditLogRequest
  ): Promise<IAuditLogSyncResponse> {
    if (!this.socket) return Promise.reject(new Error('Socket is not connected'));
    if (this.pendingAudit.has(scope)) {
      return Promise.reject(new Error('An audit sync request is already pending'));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAudit.delete(scope);
        reject(new Error('Audit synchronization response timeout'));
      }, SYNC_RESPONSE_TIMEOUT_MS);
      this.pendingAudit.set(scope, {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      try {
        this.send(SYNC_AUDIT_REQUEST_TYPE[scope], payload);
      } catch (error) {
        this.rejectAuditResponse(scope, new Error(errorMessage(error)));
      }
    });
  }

  private resolveAuditResponse(scope: AuditLogScope, response: IAuditLogSyncResponse): void {
    const pending = this.pendingAudit.get(scope);
    this.pendingAudit.delete(scope);
    pending?.resolve(response ?? { info: [] });
  }

  private rejectAuditResponse(scope: AuditLogScope, error: Error): void {
    const pending = this.pendingAudit.get(scope);
    this.pendingAudit.delete(scope);
    pending?.reject(error);
  }

  private rejectPendingRequests(error: Error): void {
    this.rejectPendingResponse(error);
    for (const scope of AUDIT_SCOPES) this.rejectAuditResponse(scope, error);
  }

  private async ensureAuditBaselines(epoch: number): Promise<void> {
    for (const scope of AUDIT_SCOPES) {
      if (this.loadAuditCursors()[scope]) continue;
      await this.resetAuditBaseline(scope, epoch);
    }
  }

  private async resetAuditBaseline(scope: AuditLogScope, epoch: number): Promise<void> {
    const watermarkId = await this.fetchAuditWatermark(scope);
    this.assertEpoch(epoch);
    const cursors = this.loadAuditCursors();
    cursors[scope] = { lastId: watermarkId, watermarkId };
    this.saveAuditCursors(cursors);
  }

  private async fetchAuditWatermark(scope: AuditLogScope): Promise<number> {
    const response = await this.requestAudit(scope, { findLast: true });
    const watermarkId = Number(response.watermarkId ?? 0);
    return Number.isFinite(watermarkId) && watermarkId > 0 ? watermarkId : 0;
  }

  private async syncAuditLogs(epoch: number): Promise<AuditLogScope[]> {
    const stale: AuditLogScope[] = [];
    for (const scope of AUDIT_SCOPES) {
      if (await this.syncAuditScope(scope, epoch)) stale.push(scope);
    }
    return stale;
  }

  private async syncAuditScope(scope: AuditLogScope, epoch: number): Promise<boolean> {
    const watermarkId = await this.fetchAuditWatermark(scope);
    this.assertEpoch(epoch);
    const saved = this.loadAuditCursors()[scope] ?? { lastId: 0, watermarkId: 0 };
    if (watermarkId < saved.lastId) return true;
    let cursor: AuditLogCursor = { ...saved, watermarkId };

    while (cursor.lastId < cursor.watermarkId) {
      let response: IAuditLogSyncResponse;
      try {
        response = await this.requestAudit(scope, buildAuditRequest(cursor));
      } catch (error) {
        if (isSyncRequestError(error, SYNC_STATUS_REPLICA_TOO_OLD)) return true;
        throw error;
      }
      this.assertEpoch(epoch);
      const entries = Array.isArray(response.info) ? response.info : [];
      if (entries.length === 0) break;
      const result = await auditLogProcessorService.apply(entries);
      this.updateCurrentUserFromAudit(entries);
      if (result.missing.length > 0) this.catchUpRequested = true;

      const nextId = Number(response.nextCursorId ?? entries.at(-1)?.id);
      if (!Number.isFinite(nextId) || nextId <= cursor.lastId) {
        throw new Error('Audit synchronization did not advance its cursor');
      }
      cursor = { ...cursor, lastId: Math.min(nextId, cursor.watermarkId) };
      const cursors = this.loadAuditCursors();
      cursors[scope] = cursor;
      this.saveAuditCursors(cursors);
    }
    return false;
  }

  private updateCurrentUserFromAudit(entries: IAuditLogEntry[]): void {
    const currentUser = this.authStore?.getState().user;
    if (!currentUser) return;

    for (const entry of entries) {
      if (entry.tableName !== 'user' || String(entry.recordId) !== String(currentUser.id)) continue;
      const partial: { name?: string; role?: UserRole; isActive?: boolean } = {};
      const name = entry.changes.name?.current;
      const role = entry.changes.role?.current;
      const isActive = entry.changes.isActive?.current;
      if (typeof name === 'string') partial.name = name;
      if (typeof role === 'string') partial.role = role as UserRole;
      if (isActive !== undefined) partial.isActive = toBool(isActive);
      if (Object.keys(partial).length > 0) this.sessionActions?.updateUser(partial);
    }
  }

  private updateCurrentUserFromRows(rows: Record<string, unknown>[] | undefined): void {
    const user = this.authStore?.getState().user;
    if (!user || !rows) return;
    const mine = rows.find((row) => String(row.id) === String(user.id));
    if (!mine) return;
    this.sessionActions?.updateUser({
      name: String(mine.name ?? ''),
      role: (mine.role as UserRole) ?? 'guest',
      isActive: toBool(mine.isActive),
    });
  }

  private async recoverUnauthorized(): Promise<void> {
    const outcome = await this.sessionActions?.refreshSession();
    if (outcome === 'rejected') {
      this.manualClose = true;
      await this.sessionActions?.clearSession();
      return;
    }
    if (!this.manualClose) this.scheduleReconnect();
  }

  private async ensureDeletedBaselines(cursors: SyncCursors, epoch: number): Promise<void> {
    const keys = SYNC_TABLE_KEYS.filter(
      (key) => !SYNC_TABLES_WITHOUT_DELETIONS.has(key) && !cursors[key]?.deletedBaseline
    );
    if (keys.length === 0) return;

    const dto: ISynchronizedDto = {};
    for (const key of keys) dto[key] = { findLastDeleted: true };
    const response = await this.requestSync(dto);
    this.assertEpoch(epoch);

    for (const key of keys) {
      const body = response[key];
      if (!body) continue;
      const cursor: SyncTableCursor = { ...cursors[key], deletedBaseline: true };
      const time = secondsOf(body.lastSyncDate?.deleted);
      if (cursor.deletedStart == null && time > 0) {
        cursor.deletedStart = time;
        cursor.deletedId = body.lastSyncDate?.deletedId;
      }
      cursors[key] = cursor;
    }
    this.saveCursors(cursors);
  }

  private async pageRows(cursors: SyncCursors, epoch: number): Promise<void> {
    let keys: SyncTableKey[] = [...SYNC_TABLE_KEYS];
    for (let page = 0; page < SYNC_MAX_PAGES; page++) {
      const response = await this.requestSync(this.buildDto(keys, cursors));
      this.assertEpoch(epoch);
      keys = await this.applyPage(keys, response, cursors);
      this.saveCursors(cursors);
      if (keys.length === 0) return;
      await delay(SYNC_PAGE_DELAY_MS);
      this.assertEpoch(epoch);
    }
    throw new Error('Synchronization page limit reached');
  }

  private async applyPage(
    keys: SyncTableKey[],
    response: ISynchronizedResponse,
    cursors: SyncCursors
  ): Promise<SyncTableKey[]> {
    const created: CreatedRows = new Map();
    const deleted: DeletedRows = new Map();
    for (const key of keys) {
      const body = response[key];
      if (!body) continue;
      created.set(
        key,
        Array.isArray(body.created) ? (body.created as Record<string, unknown>[]) : []
      );
      deleted.set(key, Array.isArray(body.deleted) ? body.deleted : []);
    }

    await database.write(async () => {
      await batchPrepared(await this.prepareRows(created, deleted, 'upsert'));
    });
    this.updateCurrentUserFromRows(created.get('user'));

    const more: SyncTableKey[] = [];
    for (const key of created.keys()) {
      const createdRows = created.get(key) ?? [];
      const deletedRows = deleted.get(key) ?? [];
      const cursor: SyncTableCursor = { ...cursors[key] };
      const createdPosition = this.maxPosition(createdRows, 'createdAt');
      if (createdPosition) {
        cursor.createdStart = createdPosition.time;
        cursor.createdId = createdPosition.id;
      }
      const deletedPosition = this.maxPosition(
        deletedRows as unknown as Record<string, unknown>[],
        'deletedAt'
      );
      if (deletedPosition) {
        cursor.deletedStart = deletedPosition.time;
        cursor.deletedId = deletedPosition.id;
      }
      cursors[key] = cursor;
      if (createdRows.length >= SYNC_PAGE_SIZE || deletedRows.length >= SYNC_PAGE_SIZE)
        more.push(key);
    }
    return more;
  }

  private async prepareRows(
    created: CreatedRows,
    deleted: DeletedRows,
    mode: CreateMode
  ): Promise<PreparedOperation[]> {
    const operations: PreparedOperation[] = [];
    for (const [key, rows] of deleted) {
      if (rows.length === 0) continue;
      const existing = await existingByServerId(
        key,
        rows.map((row) => String(row.id))
      );
      existing.forEach((record) => operations.push(() => record.prepareDestroyPermanently()));
    }
    for (const [key, rows] of created) {
      if (rows.length === 0) continue;
      const removed = new Set((deleted.get(key) ?? []).map((row) => String(row.id)));
      const latest = new Map<string, Record<string, unknown>>();
      for (const row of rows) {
        const id = String(row.id);
        if (!removed.has(id)) latest.set(id, row);
      }
      if (latest.size === 0) continue;
      const existing = await existingByServerId(key, [...latest.keys()]);
      for (const [id, row] of latest) {
        const record: Model | undefined = existing.get(id);
        if (!record) {
          operations.push(() => collection(key).prepareCreateFromDirtyRaw(toDirtyRaw(key, row)));
        } else if (mode === 'upsert') {
          operations.push(() =>
            record.prepareUpdate((model) => Object.assign(model, toModelProps(key, row)))
          );
        }
      }
    }
    return operations;
  }

  private maxPosition(
    rows: Record<string, unknown>[],
    timeField: 'createdAt' | 'deletedAt'
  ): SyncPosition | null {
    let result: SyncPosition | null = null;
    for (const row of rows) {
      const time = secondsOf(row[timeField]);
      if (time <= 0) continue;
      const id = row.id as number | string | undefined;
      if (
        !result ||
        time > result.time ||
        (time === result.time && compareIds(id, result.id) > 0)
      ) {
        result = { time, id };
      }
    }
    return result;
  }

  private buildDto(keys: readonly SyncTableKey[], cursors: SyncCursors): ISynchronizedDto {
    const dto: ISynchronizedDto = {};
    for (const key of keys) {
      const cursor = cursors[key];
      const body: ISyncBodyDto = { requiredCreate: true };
      const created = rangeFrom(cursor?.createdStart, cursor?.createdId);
      if (created) body.created = created;
      if (!SYNC_TABLES_WITHOUT_DELETIONS.has(key)) {
        body.requiredDeleted = true;
        const deleted = rangeFrom(cursor?.deletedStart, cursor?.deletedId);
        if (deleted) body.deleted = deleted;
      }
      dto[key] = body;
    }
    return dto;
  }

  private cursorKey(): string {
    return SYNC_CURSORS_PREFIX + (this.authStore?.getState().user?.id ?? '');
  }

  private loadCursors(): SyncCursors {
    const stored = storageService.getObject<SyncCursors>(this.cursorKey()) ?? {};
    const cursors: SyncCursors = {};
    for (const key of SYNC_TABLE_KEYS) {
      const cursor = stored[key];
      if (cursor?.projection === SYNC_PROJECTION_VERSION) {
        cursors[key] = cursor;
        continue;
      }
      cursors[key] = {
        ...withoutCreatedCursor(cursor),
        deletedBaseline: cursor?.deletedStart != null ? true : undefined,
      };
    }
    return cursors;
  }

  private saveCursors(cursors: SyncCursors): void {
    storageService.setObject(this.cursorKey(), cursors);
  }

  private auditCursorKey(): string {
    return SYNC_AUDIT_CURSORS_PREFIX + (this.authStore?.getState().user?.id ?? '');
  }

  private loadAuditCursors(): AuditLogCursors {
    return storageService.getObject<AuditLogCursors>(this.auditCursorKey()) ?? {};
  }

  private saveAuditCursors(cursors: AuditLogCursors): void {
    storageService.setObject(this.auditCursorKey(), cursors);
  }
}

export const synchronizeService = new SynchronizeService();
