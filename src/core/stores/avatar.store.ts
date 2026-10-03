import { create } from 'zustand';
import { REACTION_HOLD_MS } from '@/shared/constants';
import type { AvatarState, ReactionKind } from '@/core/types';

type AvatarStoreState = {
  state: AvatarState;
  reaction: ReactionKind;
  intensity: number;
  setState: (state: AvatarState) => void;
  react: (reaction: ReactionKind, intensity: number) => void;
  clearReaction: () => void;
};

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
