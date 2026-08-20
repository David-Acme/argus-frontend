import { create } from 'zustand';
import type { AuthStatus } from '@/core/types';
import type { IAuthSession, IAuthUser } from '@/core/interfaces';

/**
 * Runtime authentication context.
 *
 * This store intentionally contains no network, persistence or refresh logic.
 * Those concerns belong to sessionService so every platform follows the same
 * lifecycle and the UI can keep consuming a small synchronous context.
 */
export type AuthStoreState = {
  status: AuthStatus;
  user: IAuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: IAuthSession) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (partial: Partial<IAuthUser>) => void;
  clear: () => void;
  hydrate: (session: IAuthSession | null) => void;
};

const signedOutState = {
  status: 'signed-out' as const,
  user: null,
  accessToken: null,
  refreshToken: null,
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,

  setSession: (session) =>
    set({
      status: 'signed-in',
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }),

  setTokens: (tokens) =>
    set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),

  setUser: (partial) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...partial } });
  },

  clear: () => set(signedOutState),

  hydrate: (session) => {
    if (!session) {
      set(signedOutState);
      return;
    }
    set({
      status: 'signed-in',
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  },
}));
