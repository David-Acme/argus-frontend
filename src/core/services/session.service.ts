import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { secureStorageService } from '@/core/services/secure-storage';
import { storageService } from '@/core/services/storage';
import { readRefreshResponse } from '@/core/services/http/refresh-response';
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

  updateUser(partial: Partial<IAuthUser>): void {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const user = { ...current, ...partial };
    useAuthStore.getState().setUser(partial);
    this.persistUser(user);
  }

  async clearSession(): Promise<void> {
    this.sessionVersion += 1;
    const userId = useAuthStore.getState().user?.id ?? null;
    viewCacheCoordinatorService.stop();
    await synchronizeService.clearLocalProjection(userId);
    useAuthStore.getState().clear();
    viewCacheService.setUserId(null);
    try {
      storageService.remove(SESSION_USER_KEY);
      viewCacheService.clear();
    } catch {
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

      if (!session && (accessToken || refreshToken || user)) {
        try {
          storageService.remove(SESSION_USER_KEY);
        } catch {
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

    const reading = readRefreshResponse(result);
    if (reading.outcome !== 'refreshed') return reading.outcome;
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
    await this.persistTokens(session);
  }

  private persistUser(user: IAuthUser): void {
    try {
      storageService.setObject(SESSION_USER_KEY, user);
    } catch {
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
