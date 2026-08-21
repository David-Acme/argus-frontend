import { create } from 'zustand';
import type { BottomNavContext } from '@/core/types';

type NavigationStoreState = {
  /** Id of the screen that currently owns the bar. */
  owner: string | null;
  /** Whether the owning screen wants the bar on screen. */
  requested: boolean;
  /**
   * Last context received. It survives a release on purpose: the bar fades out
   * instead of unmounting, and it still needs its label while it does.
   */
  context: BottomNavContext | null;
  /** Manual override: tucks the bar away without giving up ownership. */
  hidden: boolean;
  claim: (owner: string, context: BottomNavContext | null) => void;
  release: (owner: string) => void;
  setHidden: (hidden: boolean) => void;
};

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
  owner: null,
  requested: false,
  context: null,
  hidden: false,
  claim: (owner, context) =>
    set((state) => ({
      owner,
      requested: context !== null,
      context: context ?? state.context,
      hidden: false,
    })),
  // Ignoring a release from a screen that no longer owns the bar is what keeps
  // it from blinking: on a transition the outgoing screen's cleanup can run
  // after the incoming one has already claimed it.
  release: (owner) => {
    if (get().owner !== owner) return;
    set({ owner: null, requested: false });
  },
  setHidden: (hidden) => set({ hidden }),
}));

/** True when the focused screen wants the bar and has not tucked it away. */
export const selectBottomNavVisible = (state: NavigationStoreState): boolean =>
  state.requested && !state.hidden;
