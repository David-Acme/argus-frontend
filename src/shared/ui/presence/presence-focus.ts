import { useEffect, useSyncExternalStore } from 'react';

type Focus = { heroes: number; listening: boolean };

let focus: Focus = { heroes: 0, listening: false };

const listeners = new Set<() => void>();

function update(next: Partial<Focus>): void {
  focus = { ...focus, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = (): Focus => focus;

export function useHeroPresence(): boolean {
  const { listening } = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    update({ heroes: focus.heroes + 1 });
    return () => update({ heroes: focus.heroes - 1 });
  }, []);
  return listening;
}

export function useCentrePresence(listening: boolean): boolean {
  const { heroes } = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    update({ listening });
    return () => update({ listening: false });
  }, [listening]);
  return heroes > 0 && !listening;
}
