import { useEffect, useMemo } from 'react';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { ViewCacheKey } from '@/shared/constants';

/**
 * Rows to render right now: the snapshot from the last visit until the local
 * query answers, then the query itself. Keeps a screen from flashing an empty
 * state for data the device already has.
 */
export function useCachedRows<T>(
  key: ViewCacheKey,
  rows: readonly T[],
  ready: boolean,
  scope?: string
): readonly T[] {
  // `scope` is the visible window for views such as the calendar. Reading the
  // primed in-memory snapshot again when it changes prevents yesterday's (or
  // last month's) rows from being painted for one frame while its local query
  // subscribes.
  const fallback = useMemo(() => viewCacheService.read<T>(key, scope), [key, scope]);

  useEffect(() => {
    if (ready) viewCacheService.write(key, rows, scope);
  }, [key, rows, ready, scope]);

  return ready ? rows : fallback;
}

/** Single value variant, for counters and summaries. */
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
