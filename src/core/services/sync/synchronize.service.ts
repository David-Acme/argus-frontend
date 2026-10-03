import { viewCacheService } from '@/core/services/view-cache.service';
import type { useAuthStore as UseAuthStoreHook } from '@/core/stores/auth.store';
import { WS_RECONNECT_BASE_MS, WS_RECONNECT_MAX_MS } from '@/shared/constants';
import type { SessionRefreshOutcome, SyncOperation, SyncUserPatch } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import type { IAuditLogEntry, IInitialInfo, ISocketEmitDto } from '@/core/interfaces';
import { AuditLogPager } from './audit-log-pager';
import { parseAuthContext } from './auth-context';
import { LiveFrameApplier } from './live-frame-applier';
import { ProjectionEpoch } from './projection-epoch';
import { userPatchFromRows, userPatchesFromAudit } from './session-user-patch';
import { SYNC_CATCH_UP_DELAY_MS, SYNC_STATUS_UNAUTHORIZED } from './sync-constants';
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
  private readonly epoch = new ProjectionEpoch();
  private readonly cursors: SyncCursorStore;
  private readonly connection: SyncConnection;
  private readonly channel: SyncRequestChannel;
  private readonly router: SyncMessageRouter;
  private readonly rows: SyncRowPager;
  private readonly audit: AuditLogPager;
  private readonly live: LiveFrameApplier;

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
    });
    this.router = new SyncMessageRouter({
      initialInfo: (info) => this.onInitialInfo(info),
      syncResponse: (response) => this.channel.resolveSync(response),
      syncFailure: (error) => this.channel.rejectSync(error),
      auditResponse: (scope, response) => this.channel.resolveAudit(scope, response),
      auditFailure: (scope, error) => this.channel.rejectAudit(scope, error),
      liveFrame: (frame) => this.live.receive(frame),
      authContextChanged: (info) => this.onAuthContextChanged(info),
    });
    this.rows = new SyncRowPager({
      request: (dto) => this.channel.requestSync(dto),
      cursors: this.cursors,
      epoch: this.epoch,
      onUserRows: (rows) => this.applyUserRows(rows),
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
        await destroyAllRows(SYNC_TABLE_KEYS);
        this.cursors.clear(userId == null ? '' : String(userId));
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

  private async performSync(): Promise<void> {
    const epoch = this.epoch.current;
    this.syncing = true;
    this.syncError = null;
    this.catchUpRequested = false;
    this.live.pause();
    try {
      await this.runSync(epoch);
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
      this.live.pause();
      if (this.epoch.isCurrent(epoch) && !isSyncRequestError(error, SYNC_STATUS_UNAUTHORIZED)) {
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
    const cursors = this.cursors.load();
    await this.audit.ensureBaselines(epoch);
    await this.rows.ensureDeletedBaselines(cursors, epoch);
    await this.rows.pageRows(cursors, epoch);
    const stale = await this.audit.syncAll(epoch);
    if (stale.length === 0) return;

    for (const scope of stale) await this.audit.resetBaseline(scope, epoch);
    for (const key of SYNC_TABLE_KEYS) cursors[key] = withoutCreatedCursor(cursors[key]);
    this.cursors.save(cursors);
    await this.rows.pageRows(cursors, epoch);
    const stillStale = await this.audit.syncAll(epoch);
    if (stillStale.length > 0) throw new Error('Audit history is older than the retention window');
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
    const epoch = this.epoch.current;

    const contextSync = (async () => {
      await Promise.allSettled([this.activeSync, this.live.settled]);
      if (!this.epoch.isCurrent(epoch)) return;
      await destroyAllRows(SYNC_TABLE_KEYS);
      if (!this.epoch.isCurrent(epoch)) return;
      this.cursors.clear();
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
