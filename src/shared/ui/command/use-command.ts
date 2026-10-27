import { useId, useState } from 'react';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import type { CommandGroup, CommandItem, CommandScopes, CommandSource } from './command-types';

export type CommandInput = {
  source: CommandSource;
  onAsk?: (query: string) => void;
  onQueryChange?: (query: string) => void;
  onClose: () => void;
  initialQuery?: string;
};

export type CommandEmpty = 'start' | 'results' | null;

export type CommandState = {
  query: string;
  setQuery: (next: string) => void;
  groups: readonly CommandGroup[];
  asks: boolean;
  empty: CommandEmpty;
  scopes?: CommandScopes;
  paging?: InfiniteListState;
  selected: number;
  listId: string;
  run: (index: number) => void;
  submit: () => void;
  onKey: (key: string) => boolean;
};

const STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

type EmptyInput = {
  query: string;
  groups: readonly CommandGroup[];
  found: number | null;
  pending: boolean;
};

export function commandEmpty({ query, groups, found, pending }: EmptyInput): CommandEmpty {
  if (query.length === 0) return groups.length > 0 ? null : 'start';
  if (found === null) return groups.length > 0 ? null : 'results';
  return found === 0 && !pending ? 'results' : null;
}

export function useCommand({
  source,
  onAsk,
  onQueryChange,
  onClose,
  initialQuery = '',
}: CommandInput): CommandState {
  const [query, setQueryState] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const listId = useId();
  const trimmed = query.trim();
  const view = source(trimmed);
  const results = view.results ?? [];
  const found =
    view.results === undefined ? null : results.reduce((sum, group) => sum + group.items.length, 0);
  const groups = [...view.actions, ...results].filter((group) => group.items.length > 0);
  const items: CommandItem[] = groups.flatMap((group) => group.items);
  const asks = trimmed.length > 0 && onAsk !== undefined;
  const offset = asks ? 1 : 0;
  const count = items.length + offset;
  const current = count === 0 ? 0 : Math.min(selected, count - 1);
  const run = (index: number) => {
    const item = items[index - offset];
    if (asks && index === 0) onAsk?.(trimmed);
    else if (item) item.onRun();
    else return;
    onClose();
  };
  const onKey = (key: string): boolean => {
    const step = STEP[key];
    if (step === undefined || count === 0) return false;
    setSelected((current + step + count) % count);
    return true;
  };
  return {
    query,
    setQuery: (next) => {
      setQueryState(next);
      setSelected(0);
      onQueryChange?.(next.trim());
    },
    groups,
    asks,
    empty: commandEmpty({ query: trimmed, groups, found, pending: view.pending ?? false }),
    scopes: trimmed.length > 0 ? view.scopes : undefined,
    paging: view.paging,
    selected: current,
    listId,
    run,
    submit: () => run(current),
    onKey,
  };
}
