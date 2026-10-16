import { create } from 'zustand';

export const PENDING_CALL_TTL_MS = 120_000;

type PendingCall = { href: string; heldAt: number };

type PendingCallState = {
  pending: PendingCall | null;
  hold: (href: string, now: number) => void;
  take: (now: number) => string | null;
};

export const usePendingCallStore = create<PendingCallState>((set, get) => ({
  pending: null,
  hold: (href, now) => set({ pending: { href, heldAt: now } }),
  take: (now) => {
    const pending = get().pending;
    if (pending === null) return null;
    set({ pending: null });
    return now - pending.heldAt <= PENDING_CALL_TTL_MS ? pending.href : null;
  },
}));

export function afterSignInHref(now: number = Date.now()): string {
  return usePendingCallStore.getState().take(now) ?? '/';
}
