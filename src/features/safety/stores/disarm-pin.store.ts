import { create } from 'zustand';

export type PinPromptPurpose = 'disarm' | 'current';

type DisarmPinState = {
  open: boolean;
  purpose: PinPromptPurpose;
  resolve: ((pin: string | null) => void) | null;
  ask: (purpose: PinPromptPurpose, resolve: (pin: string | null) => void) => void;
  answer: (pin: string | null) => void;
};

export const useDisarmPinStore = create<DisarmPinState>((set, get) => ({
  open: false,
  purpose: 'disarm',
  resolve: null,
  ask: (purpose, resolve) => {
    get().resolve?.(null);
    set({ open: true, purpose, resolve });
  },
  answer: (pin) => {
    const { resolve } = get();
    set({ open: false, resolve: null });
    resolve?.(pin);
  },
}));

export const askDisarmPin = (): Promise<string | null> =>
  new Promise((resolve) => useDisarmPinStore.getState().ask('disarm', resolve));

export const askCurrentPin = (): Promise<string | null> =>
  new Promise((resolve) => useDisarmPinStore.getState().ask('current', resolve));
