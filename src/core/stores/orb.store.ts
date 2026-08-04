import { create } from 'zustand';
import type { OrbState } from '@/core/types';

type OrbStoreState = {
  state: OrbState;
  setState: (state: OrbState) => void;
};

export const useOrbStore = create<OrbStoreState>((set) => ({
  state: 'idle',
  setState: (state) => set({ state }),
}));
