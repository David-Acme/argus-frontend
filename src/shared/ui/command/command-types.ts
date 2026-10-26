import type { IconGlyph } from '@/shared/ui/icon';

export type CommandItem = {
  id: string;
  label: string;
  meta?: string;
  icon: IconGlyph;
  shortcut?: string;
  onRun: () => void;
};

export type CommandGroup = { title: string; items: readonly CommandItem[] };

export type CommandSource = (query: string) => readonly CommandGroup[];

export type CommandIntent = 'search' | 'create';

export type CommandProps = {
  open: boolean;
  onClose: () => void;
  source: CommandSource;
  onAsk?: (query: string) => void;
  initialQuery?: string;
};
