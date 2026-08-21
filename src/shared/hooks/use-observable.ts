import { useMemo, useSyncExternalStore } from 'react';
import type { Observable } from 'rxjs';

type ObservableState<T> = {
  value: T;
  /** `true` once the observable has emitted, so an empty list means empty. */
  ready: boolean;
};

function useObservableState<T>(
  factory: () => Observable<T>,
  initialValue: T,
  deps: readonly unknown[],
): ObservableState<T> {
  const store = useMemo(() => {
    let snapshot: ObservableState<T> = { value: initialValue, ready: false };

    return {
      // No error handler on purpose: rxjs surfaces unhandled errors.
      subscribe: (onStoreChange: () => void) => {
        const subscription = factory().subscribe((value) => {
          snapshot = { value, ready: true };
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
  return useObservableState(factory, initialValue, deps).value;
}

/**
 * Same bridge, plus whether the first value already arrived. A screen that
 * rehydrates a cached snapshot needs to tell "not read yet" from "nothing".
 */
export function useObservableReady<T>(
  factory: () => Observable<T>,
  initialValue: T,
  deps: readonly unknown[] = [],
): readonly [T, boolean] {
  const state = useObservableState(factory, initialValue, deps);
  return [state.value, state.ready];
}
