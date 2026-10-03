import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { secureStorageService } from '@/core/services/secure-storage';
import { storageService } from '@/core/services/storage';
import { registerHttpAuth } from '@/core/services/http';
import { synchronizeService } from '@/core/services/sync';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { useAuthStore } from '@/core/stores/auth.store';
import { NET_STORAGE_KEYS, SESSION_USER_KEY } from '@/shared/constants';
import type { AuthStatus, NetPairedInstance, SessionRefreshOutcome } from '@/core/types';
import type { IAuthSession, IAuthUser } from '@/core/interfaces';

const REFRESH_PATH = '/auth/refresh-token';

export type SessionPairingState = {
  paired: boolean;
  instance: NetPairedInstance | null;
};

export type SessionBootstrapResult = SessionPairingState & {
  status: Exclude<AuthStatus, 'loading'>;
  restored: boolean;
};

type AuthTokens = Pick<IAuthSession, 'accessToken' | 'refreshToken'>;

/**
 * Owns the application session lifecycle.
 *
 * The store is only the in-memory projection consumed by the UI. This service
 * is the single place that restores, persists, refreshes and clears session
 * credentials, including the paired server certificate required by transport.
 */
class SessionService {
  private initialization: Promise<SessionBootstrapResult> | null = null;
  private refreshing: Promise<SessionRefreshOutcome> | null = null;
  private secureStorageQueue: Promise<void> = Promise.resolve();
  private sessionVersion = 0;
  private initialized = false;

  get isInitialized(): boolean {
    return this.initialized;
  }

  getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
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

  /** Publishes credentials immediately, then makes them durable. */
  async establish(session: IAuthSession): Promise<void> {
    this.sessionVersion += 1;
    useAuthStore.getState().setSession(session);
    viewCacheService.setUserId(session.user.id);
    viewCacheCoordinatorService.start(session.user.id);
    await this.persistSession(session);
  }

  refreshSession(): Promise<SessionRefreshOutcome> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = this.performRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  /** Updates the current user from sync and keeps the durable snapshot fresh. */
  updateUser(partial: Partial<IAuthUser>): void {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const user = { ...current, ...partial };
    useAuthStore.getState().setUser(partial);
    this.persistUser(user);
  }

  /** Clears memory immediately and removes the durable session afterwards. */
  async clearSession(): Promise<void> {
    this.sessionVersion += 1;
    const userId = useAuthStore.getState().user?.id ?? null;
    viewCacheCoordinatorService.stop();
    await synchronizeService.clearLocalProjection(userId);
    useAuthStore.getState().clear();
    viewCacheService.setUserId(null);
    try {
      storageService.remove(SESSION_USER_KEY);
      // Snapshots are what a screen paints before its query answers: another
      // user must never see the previous one's rows.
      viewCacheService.clear();
    } catch {
      // The in-memory session is already cleared; storage cleanup is best effort.
    }
    await this.deletePersistedTokens();
  }

  private async restore(): Promise<SessionBootstrapResult> {
    try {
      const [instance, accessToken, refreshToken, user] = await Promise.all([
        netService.instance(),
        secureStorageService.getStringAsync(NET_STORAGE_KEYS.accessToken),
        secureStorageService.getStringAsync(NET_STORAGE_KEYS.refreshToken),
        Promise.resolve(storageService.getObject<IAuthUser>(SESSION_USER_KEY)),
      ]);

      const session =
        instance && accessToken && refreshToken && user
          ? { accessToken, refreshToken, user }
          : null;

      useAuthStore.getState().hydrate(session);
      viewCacheService.setUserId(session?.user.id ?? null);
      if (session) viewCacheCoordinatorService.start(session.user.id);

      // Credentials without a complete paired instance can never be used.
      // Remove that stale combination so a later pairing starts cleanly.
      if (!session && (accessToken || refreshToken || user)) {
        try {
          storageService.remove(SESSION_USER_KEY);
        } catch {
          // The invalid session is already discarded from memory.
        }
        await this.deletePersistedTokens();
      }

      return {
        paired: instance !== null,
        instance,
        status: session ? 'signed-in' : 'signed-out',
        restored: session !== null,
      };
    } catch {
      useAuthStore.getState().clear();
      return { paired: false, instance: null, status: 'signed-out', restored: false };
    }
  }

  private async performRefresh(): Promise<SessionRefreshOutcome> {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return 'rejected';
    const version = this.sessionVersion;

    let instance: NetPairedInstance | null;
    try {
      instance = await netService.instance();
    } catch {
      return 'unavailable';
    }
    if (!instance) return 'rejected';

    let result;
    try {
      result = await netService.request({
        url: serviceUrl(instance, REFRESH_PATH),
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      return 'unavailable';
    }

    if (result.status === 401 || result.status === 403) return 'rejected';
    if (result.status < 200 || result.status >= 300) return 'unavailable';

    let accessToken: string | null = null;
    let nextRefreshToken = refreshToken;
    try {
      const envelope = JSON.parse(result.body) as {
        info?: { accessToken?: unknown; refreshToken?: unknown };
      };
      if (typeof envelope.info?.accessToken === 'string') accessToken = envelope.info.accessToken;
      if (typeof envelope.info?.refreshToken === 'string') nextRefreshToken = envelope.info.refreshToken;
    } catch {
      return 'unavailable';
    }
    if (!accessToken) return 'unavailable';

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
    await this.persistTokens(session);
  }

  private persistUser(user: IAuthUser): void {
    try {
      storageService.setObject(SESSION_USER_KEY, user);
    } catch {
      // Secure tokens remain the source of truth for the next restore attempt.
    }
  }

  private persistTokens(tokens: AuthTokens): Promise<void> {
    this.secureStorageQueue = this.secureStorageQueue
      .catch(() => undefined)
      .then(async () => {
        await Promise.all([
          secureStorageService.setStringAsync(NET_STORAGE_KEYS.accessToken, tokens.accessToken),
          secureStorageService.setStringAsync(NET_STORAGE_KEYS.refreshToken, tokens.refreshToken),
        ]);
      });
    this.secureStorageQueue = this.secureStorageQueue.catch(() => undefined);
    return this.secureStorageQueue;
  }

  private deletePersistedTokens(): Promise<void> {
    this.secureStorageQueue = this.secureStorageQueue
      .catch(() => undefined)
      .then(async () => {
        await Promise.all([
          secureStorageService.deleteAsync(NET_STORAGE_KEYS.accessToken),
          secureStorageService.deleteAsync(NET_STORAGE_KEYS.refreshToken),
        ]);
      });
    this.secureStorageQueue = this.secureStorageQueue.catch(() => undefined);
    return this.secureStorageQueue;
  }
}

export const sessionService = new SessionService();

registerHttpAuth({
  getAccessToken: () => sessionService.getAccessToken(),
  refreshSession: () => sessionService.refreshSession(),
  clearSession: () => sessionService.clearSession(),
});
