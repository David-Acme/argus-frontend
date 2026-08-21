import { create } from 'zustand';
import type { ToastIntent, ToastItem } from '@/core/types';
import { TOAST_DEFAULT_MS, TOAST_MAX_VISIBLE } from '@/shared/constants';

type ToastStoreState = {
  items: ToastItem[];
  show: (intent: ToastIntent, title: string, description?: string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

let sequence = 0;

export const useToastStore = create<ToastStoreState>((set) => ({
  items: [],
  show: (intent, title, description) => {
    const id = `toast-${++sequence}`;
    set((state) => ({
      items: [...state.items, { id, intent, title, description }].slice(-TOAST_MAX_VISIBLE),
    }));
    setTimeout(() => {
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    }, TOAST_DEFAULT_MS);
    return id;
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
}));
