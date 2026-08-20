import { useMemo, useSyncExternalStore } from 'react';
import type { Observable } from 'rxjs';

/**
 * Service `Observable` → React. The only bridge into the UI; it knows rxjs, not
 * the database. `deps` controls when the observable is rebuilt — list every
 * value the factory closes over.
 */
export function useObservable<T>(
  factory: () => Observable<T>,
  initialValue: T,
  deps: readonly unknown[] = [],
): T {
  const store = useMemo(() => {
    let snapshot = initialValue;

    return {
      // No error handler on purpose: rxjs surfaces unhandled errors.
      subscribe: (onStoreChange: () => void) => {
        const subscription = factory().subscribe((value) => {
          snapshot = value;
          onStoreChange();
        });

        return () => subscription.unsubscribe();
      },
      getSnapshot: () => snapshot,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  }, deps);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
