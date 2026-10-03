import { create } from 'zustand';
import type { ToastAction, ToastIntent, ToastItem } from '@/core/types';
import { TOAST_ACTION_MS, TOAST_DEFAULT_MS, TOAST_MAX_VISIBLE } from '@/shared/constants';

type ToastStoreState = {
  items: ToastItem[];
  show: (intent: ToastIntent, title: string, description?: string, action?: ToastAction) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

let sequence = 0;

export const useToastStore = create<ToastStoreState>((set) => ({
  items: [],
  show: (intent, title, description, action) => {
    const id = `toast-${++sequence}`;
    const item: ToastItem = action ? { id, intent, title, description, action } : { id, intent, title, description };
    set((state) => ({ items: [...state.items, item].slice(-TOAST_MAX_VISIBLE) }));
    setTimeout(() => {
      set((state) => ({ items: state.items.filter((entry) => entry.id !== id) }));
    }, action ? TOAST_ACTION_MS : TOAST_DEFAULT_MS);
    return id;
  },
  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clear: () => set({ items: [] }),
}));
