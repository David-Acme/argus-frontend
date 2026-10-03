import { create } from 'zustand';
import type { ConfirmRequest } from '@/core/types';

type ConfirmStoreState = {
  request: ConfirmRequest | null;
  resolve: ((accepted: boolean) => void) | null;
  ask: (request: ConfirmRequest, resolve: (accepted: boolean) => void) => void;
  answer: (accepted: boolean) => void;
};

export const useConfirmStore = create<ConfirmStoreState>((set, get) => ({
  request: null,
  resolve: null,
  ask: (request, resolve) => {
    get().resolve?.(false);
    set({ request, resolve });
  },
  answer: (accepted) => {
    get().resolve?.(accepted);
    set({ request: null, resolve: null });
  },
}));
