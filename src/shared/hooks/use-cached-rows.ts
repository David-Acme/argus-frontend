import { useMemo, useSyncExternalStore } from 'react';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { ViewCacheKey } from '@/core/types';

export function useViewCacheRevision(key: ViewCacheKey, scope?: string): number {
  const subscribe = useMemo(
    () => (listener: () => void) => viewCacheService.subscribe(key, scope, listener),
    [key, scope],
  );
  const getSnapshot = useMemo(() => () => viewCacheService.revision(key, scope), [key, scope]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useViewCacheRows<T>(key: ViewCacheKey, scope?: string): readonly T[] {
  useViewCacheRevision(key, scope);
  return viewCacheService.read<T>(key, scope);
}

export function useViewCacheValue<T>(key: ViewCacheKey, scope?: string): T | null {
  useViewCacheRevision(key, scope);
  return viewCacheService.readValue<T>(key, scope);
}
