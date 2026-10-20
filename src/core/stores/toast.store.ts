import { create } from 'zustand';
import type { ToastAction, ToastIntent, ToastItem } from '@/core/types';
import { TOAST_ACTION_MS, TOAST_DEFAULT_MS, TOAST_MAX_VISIBLE } from '@/shared/constants';

type ToastStoreState = {
  items: ToastItem[];
  parked: ToastItem[];
  show: (intent: ToastIntent, title: string, description?: string, action?: ToastAction) => string;
  dismiss: (id: string) => void;
  act: (id: string) => void;
  reopenParked: (id: string) => void;
  clear: () => void;
  clearParked: () => void;
};

let sequence = 0;

const parkable = (item: ToastItem): boolean => item.intent === 'error' && item.action !== undefined;

const closed = (state: ToastStoreState, id: string): Pick<ToastStoreState, 'items' | 'parked'> => {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) return { items: state.items, parked: state.parked };
  return {
    items: state.items.filter((entry) => entry.id !== id),
    parked: parkable(item) ? [...state.parked, item] : state.parked,
  };
};

export const useToastStore = create<ToastStoreState>((set, get) => ({
  items: [],
  parked: [],
  show: (intent, title, description, action) => {
    const id = `toast-${++sequence}`;
    const item: ToastItem = action ? { id, intent, title, description, action } : { id, intent, title, description };
    set((state) => {
      const next = [...state.items, item];
      const overflow = next.slice(0, Math.max(0, next.length - TOAST_MAX_VISIBLE));
      return {
        items: next.slice(-TOAST_MAX_VISIBLE),
        parked: [...state.parked, ...overflow.filter(parkable)],
      };
    });
    setTimeout(() => {
      set((state) => closed(state, id));
    }, action ? TOAST_ACTION_MS : TOAST_DEFAULT_MS);
    return id;
  },
  dismiss: (id) => set((state) => closed(state, id)),
  act: (id) => {
    const item = get().items.find((entry) => entry.id === id);
    set((state) => ({ items: state.items.filter((entry) => entry.id !== id) }));
    item?.action?.onPress();
  },
  reopenParked: (id) => {
    const item = get().parked.find((entry) => entry.id === id);
    if (!item) return;
    set((state) => ({ parked: state.parked.filter((entry) => entry.id !== id) }));
    get().show(item.intent, item.title, item.description, item.action);
  },
  clear: () => set({ items: [] }),
  clearParked: () => set({ parked: [] }),
}));
