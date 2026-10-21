import type { ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';
import type { SheetSlot } from '@/shared/ui/menu';

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

export type CommandProps = {
  open: boolean;
  onClose: () => void;
  source: CommandSource;
  onAsk: (query: string) => void;
  askMark?: ReactNode;
  sheet: SheetSlot;
};
