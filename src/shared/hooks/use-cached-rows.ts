import { useEffect, useMemo, useSyncExternalStore } from 'react';
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

export function useCachedRows<T>(
  key: ViewCacheKey,
  rows: readonly T[],
  ready: boolean,
  scope?: string
): readonly T[] {
  const fallback = useMemo(() => viewCacheService.read<T>(key, scope), [key, scope]);

  useEffect(() => {
    if (ready) viewCacheService.write(key, rows, scope);
  }, [key, rows, ready, scope]);

  return ready ? rows : fallback;
}

export function useCachedValue<T>(
  key: ViewCacheKey,
  value: T,
  ready: boolean,
  scope?: string
): T {
  const fallback = useMemo(() => viewCacheService.readValue<T>(key, scope), [key, scope]);

  useEffect(() => {
    if (ready) viewCacheService.writeValue(key, value, scope);
  }, [key, value, ready, scope]);

  return ready || fallback === null ? value : fallback;
}
