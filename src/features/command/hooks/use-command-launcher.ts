import { useCommandStore } from '@/features/command/stores/command.store';

export type CommandLauncher = {
  open: (query?: string) => void;
  openNew: () => void;
};

export function useCommandLauncher(): CommandLauncher {
  const launch = useCommandStore((state) => state.launch);
  return {
    open: (query) => launch('search', query),
    openNew: () => launch('create'),
  };
}
