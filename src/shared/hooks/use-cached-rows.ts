import { useMemo, useSyncExternalStore } from 'react';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { ViewCacheKey } from '@/core/types';

function useViewCacheSubscription(key: ViewCacheKey, scope?: string) {
  return useMemo(
    () => (listener: () => void) => viewCacheService.subscribe(key, scope, listener),
    [key, scope],
  );
}

export function useViewCacheRows<T>(key: ViewCacheKey, scope?: string): readonly T[] {
  const subscribe = useViewCacheSubscription(key, scope);
  const getSnapshot = useMemo(() => () => viewCacheService.rowsSnapshot<T>(key, scope), [key, scope]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useViewCacheValue<T>(key: ViewCacheKey, scope?: string): T | null {
  const subscribe = useViewCacheSubscription(key, scope);
  const getSnapshot = useMemo(() => () => viewCacheService.valueSnapshot<T>(key, scope), [key, scope]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
