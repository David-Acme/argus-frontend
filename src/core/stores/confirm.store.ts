import { create } from 'zustand';
import type { ConfirmRequest } from '@/core/types';

type ConfirmStoreState = {
  request: ConfirmRequest | null;
  /** Resolves the pending `confirm()` call; null when nothing is open. */
  resolve: ((accepted: boolean) => void) | null;
  ask: (request: ConfirmRequest, resolve: (accepted: boolean) => void) => void;
  answer: (accepted: boolean) => void;
};

export const useConfirmStore = create<ConfirmStoreState>((set, get) => ({
  request: null,
  resolve: null,
  ask: (request, resolve) => {
    // A second ask while one is open cancels the first: two stacked
    // confirmations would leave a promise hanging forever.
    get().resolve?.(false);
    set({ request, resolve });
  },
  answer: (accepted) => {
    get().resolve?.(accepted);
    set({ request: null, resolve: null });
  },
}));
