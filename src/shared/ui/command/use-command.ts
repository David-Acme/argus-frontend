import { useState } from 'react';
import type { CommandGroup, CommandItem, CommandSource } from './command-types';

export type CommandInput = {
  source: CommandSource;
  onAsk: (query: string) => void;
  onClose: () => void;
  initialQuery?: string;
};

export type CommandState = {
  query: string;
  setQuery: (next: string) => void;
  groups: readonly CommandGroup[];
  asks: boolean;
  selected: number;
  run: (index: number) => void;
  submit: () => void;
  onKey: (key: string) => boolean;
};

const STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

export function useCommand({
  source,
  onAsk,
  onClose,
  initialQuery = '',
}: CommandInput): CommandState {
  const [query, setQueryState] = useState(initialQuery);
  const [selected, setSelected] = useState(0);
  const trimmed = query.trim();
  const groups = source(trimmed);
  const items: CommandItem[] = groups.flatMap((group) => group.items);
  const asks = trimmed.length > 0;
  const offset = asks ? 1 : 0;
  const count = items.length + offset;
  const current = count === 0 ? 0 : Math.min(selected, count - 1);
  const run = (index: number) => {
    const item = items[index - offset];
    if (asks && index === 0) onAsk(trimmed);
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
    },
    groups,
    asks,
    selected: current,
    run,
    submit: () => run(current),
    onKey,
  };
}
