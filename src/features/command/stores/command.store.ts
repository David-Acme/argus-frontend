import { create } from 'zustand';
import type { CommandIntent } from '@/shared/ui/command';

type CommandStoreState = {
  open: boolean;
  intent: CommandIntent;
  query: string;
  openedAt: number;
  launch: (intent: CommandIntent, query?: string) => void;
  close: () => void;
};

export const useCommandStore = create<CommandStoreState>((set) => ({
  open: false,
  intent: 'search',
  query: '',
  openedAt: 0,
  launch: (intent, query = '') => set({ open: true, intent, query, openedAt: Date.now() }),
  close: () => set({ open: false }),
}));
