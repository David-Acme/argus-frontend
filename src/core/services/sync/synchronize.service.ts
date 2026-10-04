import { database } from '@/core/database';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { useAuthStore as UseAuthStoreHook } from '@/core/stores/auth.store';
import type {
  SessionEndNotice,
  SessionRefreshOutcome,
  SessionSignal,
  SyncCreatedRows,
  SyncCursors,
  SyncDeletedRows,
  SyncOperation,
  SyncUserPatch,
} from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import type { IAuditLogEntry, IInitialInfo, ISocketEmitDto } from '@/core/interfaces';
import { AuditLogPager } from './audit-log-pager';
import { parseAuthContext } from './auth-context';
import { GRANT_TABLES } from './grant-scope';
import { GrantScopePager } from './grant-scope-pager';
import { sweepRevokedGrants } from './grant-sweep';
import { endNoticeOf } from './session-end-notice';
import { LiveFrameApplier } from './live-frame-applier';
import { ProjectionEpoch } from './projection-epoch';
import { ownsProjection, ProjectionOwnerStore, type ProjectionOwner } from './projection-owner';
import { userPatchFromRows, userPatchesFromAudit } from './session-user-patch';
import { SYNC_CATCH_UP_DELAY_MS, SYNC_STATUS_UNAUTHORIZED } from './sync-constants';
import { backoffDelay } from './sync-backoff';
import { SyncConnection } from './sync-connection';
import { withoutCreatedCursor } from './sync-cursor';
import { SyncCursorStore } from './sync-cursor-store';
import { destroyAllRows } from './sync-db-utils';
import { SyncMessageRouter } from './sync-message-router';
import { SyncRequestChannel } from './sync-request-channel';
import { errorMessage, isSyncRequestError } from './sync-request-error';
import { SyncRowPager } from './sync-row-pager';

type AuthStoreApi = typeof UseAuthStoreHook;

type SessionActions = {
  refreshSession: () => Promise<SessionRefreshOutcome>;
  clearSession: () => Promise<void>;
  updateUser: (partial: SyncUserPatch) => void;
  endSession: (notice: SessionEndNotice) => Promise<void>;
};

class SynchronizeService {
  private authStore: AuthStoreApi | null = null;
  private sessionActions: SessionActions | null = null;
  private bound = false;
  private clearing = false;
  private clearChain: Promise<void> = Promise.resolve();
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private syncRetryAttempt = 0;
  private syncing = false;
  private activeSync: Promise<void> | null = null;
  private contextSync: Promise<void> | null = null;
  private lastSyncAt: number | null = null;
  private syncError: string | null = null;
  private catchUpRequested = false;
  private readyEpoch: number | null = null;
  private contextResyncQueued = false;
  private readonly epoch = new ProjectionEpoch();
  private readonly owner = new ProjectionOwnerStore(database.localStorage);
  private readonly cursors: SyncCursorStore;
  private readonly connection: SyncConnection;
  private readonly channel: SyncRequestChannel;
  private readonly router: SyncMessageRouter;
  private readonly rows: SyncRowPager;
  private readonly audit: AuditLogPager;
  private readonly grants: GrantScopePager;
  private readonly live: LiveFrameApplier;
  private readonly sessionsChangedListeners = new Set<() => void>();
  private readonly userSessionsChangedListeners = new Set<(userId: number) => void>();

  constructor() {
    this.cursors = new SyncCursorStore(() => String(this.authStore?.getState().user?.id ?? ''));
    this.connection = new SyncConnection({
      accessToken: () => this.authStore?.getState().accessToken,
      isClearing: () => this.clearing,
      onAttach: () => this.live.pause(),
      onLost: (reason) => {
        this.live.pause();
        this.channel.rejectAll(reason);
      },
      onText: (raw) => this.router.route(raw),
      onBinary: (data) => this.router.routeBinary(data),
      refreshSession: () => this.sessionActions?.refreshSession(),
      clearSession: () => this.sessionActions?.clearSession(),
    });
    this.channel = new SyncRequestChannel({
      isOpen: () => this.connection.hasSocket,
      send: (type, payload) => this.send(type, payload),
      onTimeout: (reason) => this.connection.recycle(reason),
    });
    this.router = new SyncMessageRouter({
      initialInfo: (info) => this.onInitialInfo(info),
      syncResponse: (response) => this.channel.resolveSync(response),
      syncFailure: (error) => this.channel.rejectSync(error),
      auditResponse: (scope, response) => this.channel.resolveAudit(scope, response),
      auditFailure: (scope, error) => this.channel.rejectAudit(scope, error),
      liveFrame: (frame) => this.live.receive(frame),
      authContextChanged: (info) => this.onAuthContextChanged(info),
      sessionSignal: (signal) => this.onSessionSignal(signal),
    });
    this.rows = new SyncRowPager({
      request: (dto) => this.channel.requestSync(dto),
      cursors: this.cursors,
      epoch: this.epoch,
      onUserRows: (rows) => this.applyUserRows(rows),
      onCreatedRows: (created) => {
        this.grants.remember(created, this.currentUserId());
      },
    });
    this.grants = new GrantScopePager({
      request: (dto) => this.channel.requestSync(dto),
      cursors: this.cursors,
      epoch: this.epoch,
    });
    this.audit = new AuditLogPager({
      request: (scope, payload) => this.channel.requestAudit(scope, payload),
      cursors: this.cursors,
      epoch: this.epoch,
      onEntries: (entries) => this.applyUserAudit(entries),
      onMissing: () => {
        this.catchUpRequested = true;
      },
    });
    this.live = new LiveFrameApplier({
      epoch: this.epoch,
      cursors: this.cursors,
      onUserRows: (rows) => this.applyUserRows(rows),
      onGrants: (created, deleted) => this.applyLiveGrants(created, deleted),
      onUserAudit: (entries) => this.applyUserAudit(entries),
      onOverflow: () => this.scheduleSync(0),
      onFailure: (message) => {
        this.syncError = message;
      },
      requestCatchUp: () => this.requestCatchUp(),
    });
  }

  get isSyncing(): boolean {
    return this.syncing;
  }

  get isSocketConnected(): boolean {
    return this.connection.isConnected;
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
      if (state.status === 'signed-in' && prev.status !== 'signed-in')
        void this.connection.connect();
      if (state.status === 'signed-out' && prev.status === 'signed-in') this.disconnect();
    });
    if (store.getState().status === 'signed-in') void this.connection.connect();
  }

  async ensureConnected(): Promise<boolean> {
    const attempt = this.connection.attempt;
    if (attempt) return attempt;
    if (this.connection.hasSocket) return true;
    if (!this.authStore || this.authStore.getState().status !== 'signed-in') return false;
    return this.connection.connect();
  }

  send(type: string, payload?: unknown): void {
    this.connection.sendText(JSON.stringify({ type, payload }));
  }

  sendBinary(data: ArrayBuffer): void {
    this.connection.sendBinary(data);
  }

  on(operation: SyncOperation, listener: (msg: ISocketEmitDto) => void): () => void {
    return this.router.on(operation, listener);
  }

  onType(type: string, listener: (payload: unknown) => void): () => void {
    return this.router.onType(type, listener);
  }

  onBinary(listener: (data: ArrayBuffer) => void): () => void {
    return this.router.onBinary(listener);
  }

  onUserSessionsChanged(listener: (userId: number) => void): () => void {
    this.userSessionsChangedListeners.add(listener);
    return () => {
      this.userSessionsChangedListeners.delete(listener);
    };
  }

  onSessionsChanged(listener: () => void): () => void {
    this.sessionsChangedListeners.add(listener);
    return () => {
      this.sessionsChangedListeners.delete(listener);
    };
  }

  onConnect(callback: () => void): () => void {
    return this.connection.onConnect(callback);
  }

  onDisconnect(callback: () => void): () => void {
    return this.connection.onDisconnect(callback);
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
        await Promise.allSettled([this.activeSync, this.contextSync, this.live.settled]);
        await this.owner.forget();
        this.cursors.clear(userId == null ? '' : String(userId));
        await destroyAllRows(SYNC_TABLE_KEYS);
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
    this.connection.halt();
    this.clearSyncTimer();
    this.channel.rejectAll(new Error('Socket disconnected'));
    this.connection.release();
    this.live.pause();
    this.connection.setConnected(false);
  }

  private resetLiveState(): void {
    this.epoch.advance();
    this.live.reset();
    this.catchUpRequested = false;
    this.syncRetryAttempt = 0;
  }

  private clearSyncTimer(): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
  }

  private startSync(): Promise<void> {
    if (!this.connection.hasSocket) return Promise.resolve();
    if (this.activeSync) return this.activeSync;

    const activeSync = this.performSync().finally(() => {
      if (this.activeSync === activeSync) this.activeSync = null;
    });
    this.activeSync = activeSync;
    return activeSync;
  }

  private scheduleSync(delayMs: number): void {
    if (this.syncTimer || this.connection.isManuallyClosed) return;
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

  private requestScopeSync(): void {
    if (this.syncing) {
      this.catchUpRequested = true;
      return;
    }
    this.scheduleSync(0);
  }

  private currentUserId(): string | null {
    const user = this.authStore?.getState().user;
    return user ? String(user.id) : null;
  }

  private async applyLiveGrants(created: SyncCreatedRows, deleted: SyncDeletedRows): Promise<void> {
    if (this.grants.remember(created, this.currentUserId())) this.requestScopeSync();
    const revoked = [...deleted].some(([key, rows]) => GRANT_TABLES.has(key) && rows.length > 0);
    if (revoked) await sweepRevokedGrants(this.currentUserId());
  }

  private async pageProjection(cursors: SyncCursors, epoch: number): Promise<void> {
    await this.rows.pageRows(cursors, epoch);
    await this.grants.bootstrap(epoch);
    this.epoch.assert(epoch);
    await sweepRevokedGrants(this.currentUserId());
  }

  private currentOwner(): ProjectionOwner | null {
    const user = this.authStore?.getState().user;
    return user ? { userId: String(user.id), role: user.role } : null;
  }

  private async performSync(): Promise<void> {
    const epoch = this.epoch.current;
    const owner = this.currentOwner();
    this.syncing = true;
    this.syncError = null;
    this.catchUpRequested = false;
    this.live.pause();
    try {
      await this.runSync(epoch);
      if (owner && this.epoch.isCurrent(epoch)) {
        await this.owner.write(owner);
        this.readyEpoch = epoch;
      }
      this.lastSyncAt = Date.now();
      this.syncRetryAttempt = 0;
      this.syncing = false;
      if (!this.epoch.isCurrent(epoch)) return;
      if (!this.live.resume()) {
        this.scheduleSync(0);
        return;
      }
      if (this.catchUpRequested) {
        this.catchUpRequested = false;
        this.scheduleSync(SYNC_CATCH_UP_DELAY_MS);
      }
    } catch (error) {
      this.syncError = errorMessage(error);
      const projectionReady = this.readyEpoch === epoch && this.epoch.isCurrent(epoch);
      if (!projectionReady || !this.live.resume()) this.live.pause();
      if (this.epoch.isCurrent(epoch) && !isSyncRequestError(error, SYNC_STATUS_UNAUTHORIZED)) {
        const wait = backoffDelay(this.syncRetryAttempt);
        this.syncRetryAttempt += 1;
        this.scheduleSync(wait);
      }
    } finally {
      this.syncing = false;
    }
  }

  private async runSync(epoch: number): Promise<void> {
    const cursors = this.cursors.load();
    await this.audit.ensureBaselines(epoch);
    await this.rows.ensureDeletedBaselines(cursors, epoch);
    await this.pageProjection(cursors, epoch);
    const stale = await this.audit.syncAll(epoch);
    if (stale.length === 0) return;

    for (const scope of stale) {
      await this.audit.resetBaseline(scope, epoch);
      this.live.forgetAuditHigh(scope);
    }
    for (const key of SYNC_TABLE_KEYS) cursors[key] = withoutCreatedCursor(cursors[key]);
    this.cursors.save(cursors);
    await this.pageProjection(cursors, epoch);
    const stillStale = await this.audit.syncAll(epoch);
    if (stillStale.length > 0) throw new Error('Audit history is older than the retention window');
  }

  private onInitialInfo(info: IInitialInfo): void {
    if (this.authStore?.getState().status !== 'signed-in') {
      void this.sessionActions?.clearSession();
      return;
    }
    this.sessionActions?.updateUser({ id: info.id, role: info.role, isActive: info.isActive });
    const epoch = this.epoch.current;
    const expected = { userId: String(info.id), role: info.role };
    void this.owner
      .read()
      .catch(() => null)
      .then((owner) => {
        if (!this.epoch.isCurrent(epoch)) return;
        if (ownsProjection(owner, expected)) void this.syncOnce();
        else this.startContextResync();
      });
  }

  private onAuthContextChanged(info: unknown): void {
    const currentUser = this.authStore?.getState().user;
    if (!currentUser) return;

    const context = parseAuthContext(info, currentUser.id);
    if (!context) return;

    this.sessionActions?.updateUser(context.user);
    if (!context.user.isActive) {
      void this.sessionActions?.endSession('account-disabled');
      return;
    }
    if (context.requiresResync) this.startContextResync();
  }

  private onSessionSignal(signal: SessionSignal): void {
    if (signal.reason === 'sessionsChanged') {
      this.sessionsChangedListeners.forEach((listener) => listener());
      return;
    }
    if (signal.reason === 'userSessionsChanged') {
      this.userSessionsChangedListeners.forEach((listener) => listener(signal.userId));
      return;
    }
    if (this.authStore?.getState().status !== 'signed-in') return;
    void this.sessionActions?.endSession(endNoticeOf(signal.cause));
  }

  private startContextResync(): void {
    if (this.contextSync) {
      this.contextResyncQueued = true;
      return;
    }
    this.resetLiveState();
    const epoch = this.epoch.current;

    const contextSync = (async () => {
      await Promise.allSettled([this.activeSync, this.live.settled]);
      if (!this.epoch.isCurrent(epoch)) return;
      await this.owner.forget();
      this.cursors.clear();
      await destroyAllRows(SYNC_TABLE_KEYS);
      if (!this.epoch.isCurrent(epoch)) return;
      viewCacheService.clear();
      await this.startSync();
    })()
      .catch((error: unknown) => {
        this.syncError = errorMessage(error);
      })
      .finally(() => {
        if (this.contextSync === contextSync) this.contextSync = null;
        if (!this.contextResyncQueued) return;
        this.contextResyncQueued = false;
        this.startContextResync();
      });
    this.contextSync = contextSync;
  }

  private applyUserAudit(entries: IAuditLogEntry[]): void {
    const currentUser = this.authStore?.getState().user;
    if (!currentUser) return;
    for (const patch of userPatchesFromAudit(entries, currentUser.id)) {
      this.sessionActions?.updateUser(patch);
    }
  }

  private applyUserRows(rows: Record<string, unknown>[] | undefined): void {
    const user = this.authStore?.getState().user;
    if (!user || !rows) return;
    const patch = userPatchFromRows(rows, user.id);
    if (patch) this.sessionActions?.updateUser(patch);
  }
}

export const synchronizeService = new SynchronizeService();
