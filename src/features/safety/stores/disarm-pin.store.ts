import { create } from 'zustand';

type DisarmPinState = {
  open: boolean;
  resolve: ((pin: string | null) => void) | null;
  ask: (resolve: (pin: string | null) => void) => void;
  answer: (pin: string | null) => void;
};

export const useDisarmPinStore = create<DisarmPinState>((set, get) => ({
  open: false,
  resolve: null,
  ask: (resolve) => {
    get().resolve?.(null);
    set({ open: true, resolve });
  },
  answer: (pin) => {
    const { resolve } = get();
    set({ open: false, resolve: null });
    resolve?.(pin);
  },
}));

export const askDisarmPin = (): Promise<string | null> =>
  new Promise((resolve) => useDisarmPinStore.getState().ask(resolve));
