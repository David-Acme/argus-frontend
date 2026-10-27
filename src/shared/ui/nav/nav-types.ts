import type { ReactNode } from 'react';
import type { IconGlyph } from '@/shared/ui/icon';
import type { PresenceState } from '@/shared/ui/presence';

export type ListenMode = 'off' | 'hold' | 'toggle';

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
  canListen?: boolean;
};

export type NavCopy = {
  navigation: string;
  argusHint: string;
  listening: string;
  listeningTap: string;
  command: string;
  commandKey: string;
};

export type NavProps = {
  items: readonly NavItem[];
  active: string;
  onSelect: (key: string) => void;
  voice: NavVoice;
  copy: NavCopy;
  presence?: PresenceState;
  onCommand?: () => void;
  status?: ReactNode;
  settings?: NavItem;
  listening?: ListenMode;
};
