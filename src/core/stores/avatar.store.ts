import { create } from 'zustand';
import { REACTION_HOLD_MS } from '@/shared/constants';
import type { AvatarState, ReactionKind } from '@/core/types';

type AvatarStoreState = {
  state: AvatarState;
  /** Semantic reaction from the backend; overrides the phase pose while held. */
  reaction: ReactionKind;
  /** 0..1, how strongly to play the reaction. */
  intensity: number;
  setState: (state: AvatarState) => void;
  react: (reaction: ReactionKind, intensity: number) => void;
  clearReaction: () => void;
};

// A reaction is punctuation, not a mood: it expires on its own so the face
// never gets stuck on a surprise from four turns ago. Module-scoped because the
// timer belongs to the store, not to any component that happens to be mounted.
let holdTimer: ReturnType<typeof setTimeout> | null = null;

export const useAvatarStore = create<AvatarStoreState>((set) => ({
  state: 'idle',
  reaction: 'idle',
  intensity: 0,
  setState: (state) => set({ state }),
  react: (reaction, intensity) => {
    if (holdTimer != null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    set({ reaction, intensity: Math.min(1, Math.max(0, intensity)) });
    if (reaction === 'idle') {
      return;
    }
    holdTimer = setTimeout(() => {
      holdTimer = null;
      set({ reaction: 'idle', intensity: 0 });
    }, REACTION_HOLD_MS);
  },
  clearReaction: () => {
    if (holdTimer != null) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    set({ reaction: 'idle', intensity: 0 });
  },
}));
