import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import type { IconGlyph } from '@/shared/ui/icon';

export type CommandInk = 'neutral' | 'accent' | 'ok' | 'agenda' | 'project' | 'person';

export type CommandItem = {
  id: string;
  label: string;
  meta?: string;
  icon: IconGlyph;
  ink?: CommandInk;
  shortcut?: string;
  onRun: () => void;
};

export type CommandGroup = { title: string; items: readonly CommandItem[] };

export type CommandScope = { key: string; label: string };

export type CommandScopes = {
  options: readonly CommandScope[];
  value: string;
  onChange: (key: string) => void;
};

export type CommandView = {
  actions: readonly CommandGroup[];
  results?: readonly CommandGroup[];
  scopes?: CommandScopes;
  paging?: InfiniteListState;
  pending?: boolean;
};

export type CommandSource = (query: string) => CommandView;

export type CommandIntent = 'search' | 'create';

export type CommandProps = {
  open: boolean;
  onClose: () => void;
  source: CommandSource;
  onAsk?: (query: string) => void;
  onQueryChange?: (query: string) => void;
  initialQuery?: string;
};
