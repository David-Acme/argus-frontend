import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { cleanDeviceCredential, setDeviceCredential } from '@/core/services/net/device-credential';
import { secureStorageService } from '@/core/services/secure-storage';
import { storageService } from '@/core/services/storage';
import {
  readRefreshResponse,
  refreshOutcomeOf,
  serverReplyOf,
  settledRefresh,
  type RefreshReading,
} from '@/core/services/http/refresh-response';
import { decideRestore, restoreRetryDelayMs, type RestoreDecision, type StoredSessionReading } from '@/core/services/session-restore';
import '@/core/services/native-trace-sink';
import { traceEvent } from '@/core/services/native-trace';
import type { TraceOutcome } from '@/core/services/native-trace.types';
import { registerHttpAuth } from '@/core/services/http';
import { log } from '@/core/services/log';
import { synchronizeService } from '@/core/services/sync';
import { bindResourceSignal } from '@/core/services/sync/resource-signal-binding';
import { applyCachedAccess, contextEngine } from '@/core/services/context';
import { moduleEngine } from '@/core/services/modules';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/stores/auth.store';
import { useToastStore } from '@/core/stores/toast.store';
import {
  NET_STORAGE_KEYS,
  SESSION_TOKEN_PERSIST_ATTEMPTS,
  SESSION_TOKEN_PERSIST_RETRY_MS,
  SESSION_USER_KEY,
} from '@/shared/constants';
import type {
  AuthStatus,
  NetPairedInstance,
  SessionCredential,
  SessionEndNotice,
  SessionRefreshOutcome,
} from '@/core/types';
import type { IAuthSession, IAuthUser } from '@/core/interfaces';

const REFRESH_PATH = '/auth/refresh-token';

function restoreTraceOutcome(decision: RestoreDecision): TraceOutcome {
  if (decision.kind === 'session') return 'ok';
  return decision.kind === 'absent' ? 'absent' : 'partial';
}

function restoreTraceReason(decision: RestoreDecision): string {
  if (decision.kind === 'session') return 'session';
  return decision.kind === 'absent' ? 'none' : decision.reason;
}

function refreshTraceOutcome(outcome: SessionRefreshOutcome): TraceOutcome {
  if (outcome === 'refreshed') return 'ok';
  return outcome === 'rejected' ? 'refresh-rejected' : 'unavailable';
}

function refreshTraceReason(outcome: SessionRefreshOutcome): string {
  if (outcome === 'refreshed') return 'rotated';
  return outcome === 'rejected' ? 'refused' : 'unreachable';
}

export type SessionPairingState = {
  paired: boolean;
  instance: NetPairedInstance | null;
};

export type SessionBootstrapResult = SessionPairingState & {
  status: Exclude<AuthStatus, 'loading'>;
  restored: boolean;
};

type AuthTokens = Pick<IAuthSession, 'accessToken' | 'refreshToken'>;

type PersistRetry = {
  tokens: AuthTokens;
  credential: string | null | undefined;
  version: number;
  attempt: number;
};

class SessionService {
  private initialization: Promise<SessionBootstrapResult> | null = null;
  private refreshing: Promise<SessionRefreshOutcome> | null = null;
  private clearing: Promise<void> | null = null;
  private secureStorageQueue: Promise<void> = Promise.resolve();
  private persistRetry: ReturnType<typeof setTimeout> | null = null;
  private sessionVersion = 0;
  private initialized = false;

  get isInitialized(): boolean {
    return this.initialized;
  }

  getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  credential(): SessionCredential {
    return { accessToken: this.getAccessToken(), version: this.sessionVersion };
  }

  async initialize(): Promise<SessionBootstrapResult> {
    if (this.initialization) return this.initialization;

    this.initialization = this.restore().finally(() => {
      this.initialized = true;
    });
    return this.initialization;
  }

  async getPairingState(): Promise<SessionPairingState> {
    try {
      const instance = await netService.instance();
      return { paired: instance !== null, instance };
    } catch {
      return { paired: false, instance: null };
    }
  }

  async establish(session: IAuthSession): Promise<void> {
    this.sessionVersion += 1;
    setDeviceCredential(session.deviceSecret);
    useAuthStore.getState().setSession(session);
    viewCacheService.setUserId(session.user.id);
    this.startAccess(session.user.id);
    viewCacheCoordinatorService.start(session.user.id);
    await this.persistSession(session);
  }

  private startAccess(userId: number | string): void {
    moduleEngine.start(String(userId));
    contextEngine.start(String(userId));
    bindResourceSignal();
    applyCachedAccess();
  }

  refreshSession(failed?: SessionCredential): Promise<SessionRefreshOutcome> {
    const settled = settledRefresh(failed, this.credential());
    if (settled) return Promise.resolve(settled);
    if (this.refreshing) return this.refreshing;

    this.refreshing = this.performRefresh()
      .then((outcome) => {
        traceEvent('refresh', refreshTraceOutcome(outcome), refreshTraceReason(outcome));
        return outcome;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  updateUser(partial: Partial<IAuthUser>): void {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const user = { ...current, ...partial };
    useAuthStore.getState().setUser(partial);
    this.persistUser(user);
  }

  clearSession(failed?: SessionCredential): Promise<void> {
    if (failed && failed.version !== this.sessionVersion) return Promise.resolve();
    if (this.clearing) return this.clearing;
    const clearing = this.performClear().finally(() => {
      if (this.clearing === clearing) this.clearing = null;
    });
    this.clearing = clearing;
    return clearing;
  }

  endSession(notice: SessionEndNotice): Promise<void> {
    if (this.clearing) return this.clearing;
    if (useAuthStore.getState().status !== 'signed-in') return Promise.resolve();
    useToastStore.getState().show('info', t(`screens.sessions.notice.${notice}`));
    return this.clearSession();
  }

  private async performClear(): Promise<void> {
    this.sessionVersion += 1;
    this.cancelPersistRetry();
    const userId = useAuthStore.getState().user?.id ?? null;
    viewCacheCoordinatorService.stop();
    contextEngine.stop();
    moduleEngine.stop();
    try {
      await synchronizeService.clearLocalProjection(userId);
    } catch (error) {
      log.error('session', 'the local projection was not wiped; the next sync rebuilds it', error);
    } finally {
      setDeviceCredential(null);
      useAuthStore.getState().clear();
      viewCacheService.setUserId(null);
      try {
        storageService.remove(SESSION_USER_KEY);
        viewCacheService.clear();
      } catch {
      }
      await this.deletePersistedTokens();
    }
  }

  private async restore(): Promise<SessionBootstrapResult> {
    const reading = await this.readStoredSessionUntilReadable();
    const decision = decideRestore(reading);
    const { instance, accessToken, refreshToken, deviceCredential, user } = reading;
    const deviceSecret = cleanDeviceCredential(deviceCredential);
    const session =
      decision.kind === 'session' && instance && accessToken && refreshToken && user
        ? { accessToken, refreshToken, deviceSecret, user }
        : null;

    try {
      setDeviceCredential(session ? deviceSecret : null);
      useAuthStore.getState().hydrate(session);
      viewCacheService.setUserId(session?.user.id ?? null);
      if (session) {
        this.startAccess(session.user.id);
        viewCacheCoordinatorService.start(session.user.id);
      }
    } catch {
      useAuthStore.getState().clear();
      return { paired: false, instance: null, status: 'signed-out', restored: false };
    }

    traceEvent('restore', restoreTraceOutcome(decision), restoreTraceReason(decision));
    return {
      paired: instance !== null,
      instance,
      status: session ? 'signed-in' : 'signed-out',
      restored: session !== null,
    };
  }

  private async readStoredSessionUntilReadable(): Promise<StoredSessionReading> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        const [instance, accessToken, refreshToken, deviceCredential] = await Promise.all([
          netService.instance(),
          secureStorageService.getStringAsync(NET_STORAGE_KEYS.accessToken),
          secureStorageService.getStringAsync(NET_STORAGE_KEYS.refreshToken),
          secureStorageService.getStringAsync(NET_STORAGE_KEYS.deviceCredential),
        ]);
        const user = storageService.getObject<IAuthUser>(SESSION_USER_KEY);
        return { instance, accessToken, refreshToken, deviceCredential, user };
      } catch {
        traceEvent('restore', 'error', 'read-error');
        await new Promise<void>((resolve) => setTimeout(resolve, restoreRetryDelayMs(attempt)));
      }
    }
  }

  private async performRefresh(): Promise<SessionRefreshOutcome> {
    const { refreshToken } = useAuthStore.getState();
    const version = this.sessionVersion;

    let instance: NetPairedInstance | null = null;
    try {
      instance = await netService.instance();
    } catch {
      instance = null;
    }

    let reading: RefreshReading | null = null;
    if (refreshToken && instance) {
      try {
        reading = readRefreshResponse(
          await netService.request({
            url: serviceUrl(instance, REFRESH_PATH),
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ refreshToken }),
          }),
        );
      } catch {
        reading = null;
      }
    }

    if (reading?.outcome === 'rejected' && reading.accountDisabled) {
      void this.endSession('account-disabled');
    }
    const outcome = refreshOutcomeOf({
      refreshTokenInMemory: refreshToken !== null && refreshToken !== undefined && refreshToken !== '',
      instancePaired: instance !== null,
      server: reading ? serverReplyOf(reading) : null,
    });
    if (outcome !== 'refreshed' || reading?.outcome !== 'refreshed' || !refreshToken) return outcome;
    const { accessToken } = reading;
    const nextRefreshToken = reading.refreshToken ?? refreshToken;

    if (version !== this.sessionVersion || useAuthStore.getState().refreshToken !== refreshToken) {
      return 'unavailable';
    }

    const tokens = { accessToken, refreshToken: nextRefreshToken };
    useAuthStore.getState().setTokens(tokens);
    await this.persistTokens(tokens);
    return 'refreshed';
  }

  private async persistSession(session: IAuthSession): Promise<void> {
    this.persistUser(session.user);
    await this.persistTokens(session, cleanDeviceCredential(session.deviceSecret));
  }

  private persistUser(user: IAuthUser): void {
    try {
      storageService.setObject(SESSION_USER_KEY, user);
    } catch {
    }
  }

  private persistTokens(tokens: AuthTokens, credential?: string | null, attempt = 1): Promise<void> {
    const version = this.sessionVersion;
    this.secureStorageQueue = this.secureStorageQueue
      .catch(() => undefined)
      .then(async () => {
        await Promise.all([
          secureStorageService.setStringAsync(NET_STORAGE_KEYS.accessToken, tokens.accessToken),
          secureStorageService.setStringAsync(NET_STORAGE_KEYS.refreshToken, tokens.refreshToken),
          ...this.credentialWrites(credential),
        ]);
      })
      .catch((error: unknown) => {
        log.error('session', `tokens were not persisted (attempt ${attempt})`, error);
        if (attempt < SESSION_TOKEN_PERSIST_ATTEMPTS) {
          this.schedulePersistRetry({ tokens, credential, version, attempt: attempt + 1 });
        }
      });
    return this.secureStorageQueue;
  }

  private credentialWrites(credential: string | null | undefined): Promise<void>[] {
    if (credential === undefined) return [];
    if (credential === null) return [secureStorageService.deleteAsync(NET_STORAGE_KEYS.deviceCredential)];
    return [secureStorageService.setStringAsync(NET_STORAGE_KEYS.deviceCredential, credential)];
  }

  private schedulePersistRetry(retry: PersistRetry): void {
    const { tokens, credential, version, attempt } = retry;
    this.cancelPersistRetry();
    this.persistRetry = setTimeout(() => {
      this.persistRetry = null;
      const stillCurrent =
        version === this.sessionVersion && useAuthStore.getState().refreshToken === tokens.refreshToken;
      if (stillCurrent) void this.persistTokens(tokens, credential, attempt);
    }, SESSION_TOKEN_PERSIST_RETRY_MS * attempt);
  }

  private cancelPersistRetry(): void {
    if (this.persistRetry) clearTimeout(this.persistRetry);
    this.persistRetry = null;
  }

  private deletePersistedTokens(): Promise<void> {
    this.secureStorageQueue = this.secureStorageQueue
      .catch(() => undefined)
      .then(async () => {
        await Promise.all([
          secureStorageService.deleteAsync(NET_STORAGE_KEYS.accessToken),
          secureStorageService.deleteAsync(NET_STORAGE_KEYS.refreshToken),
          secureStorageService.deleteAsync(NET_STORAGE_KEYS.deviceCredential),
        ]);
      });
    this.secureStorageQueue = this.secureStorageQueue.catch(() => undefined);
    return this.secureStorageQueue;
  }
}

export const sessionService = new SessionService();

registerHttpAuth({
  credential: () => sessionService.credential(),
  refreshSession: (failed) => sessionService.refreshSession(failed),
  clearSession: (failed) => sessionService.clearSession(failed),
});
