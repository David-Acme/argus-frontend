import type { ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';

export type NavItem = {
  key: string;
  label: string;
  icon: IconGlyph;
  shortcut?: string;
  count?: string;
  argus?: boolean;
};

export type NavVoice = {
  onOpenChat: () => void;
  onListenStart: () => void;
  onListenEnd: (send: boolean) => void;
};

export type NavCopy = {
  navigation: string;
  argusHint: string;
  listening: string;
  command: string;
  commandKey: string;
};

export type NavPresence = (size: number, listening: boolean) => ReactNode;

export type NavProps = {
  items: readonly NavItem[];
  active: string;
  onSelect: (key: string) => void;
  voice: NavVoice;
  copy: NavCopy;
  presence?: NavPresence;
  onCommand?: () => void;
  status?: ReactNode;
  settings?: NavItem;
  listening?: boolean;
};
