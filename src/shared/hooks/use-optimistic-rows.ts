import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  applyIntents,
  isPendingRow,
  optimisticRegistry,
  pendingKeys,
  settledIntents,
  type OptimisticLens,
} from '@/shared/libs/optimistic';

export type OptimisticRows<Row> = {
  rows: readonly Row[];
  isPending: (row: Row) => boolean;
};

export function useOptimisticRows<Row>(
  rows: readonly Row[],
  lenses: readonly OptimisticLens<Row>[],
  compare?: (left: Row, right: Row) => number
): OptimisticRows<Row> {
  const intents = useSyncExternalStore(
    optimisticRegistry.subscribe,
    optimisticRegistry.snapshot,
    optimisticRegistry.snapshot
  );
  const merged = useMemo(
    () => applyIntents(rows, intents, lenses, compare),
    [compare, intents, lenses, rows]
  );
  const pending = useMemo(() => pendingKeys(intents), [intents]);

  const isPending = useCallback(
    (row: Row) => isPendingRow(row, pending, lenses),
    [lenses, pending]
  );

  useEffect(() => {
    const settled = settledIntents(rows, intents, lenses);
    if (settled.length > 0) optimisticRegistry.settle(settled);
  }, [intents, lenses, rows]);

  return { rows: merged, isPending };
}
