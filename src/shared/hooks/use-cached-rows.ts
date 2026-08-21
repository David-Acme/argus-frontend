import { useEffect, useState } from 'react';
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
  const [fallback] = useState(() => viewCacheService.read<T>(key, scope));

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
  const [fallback] = useState(() => viewCacheService.readValue<T>(key, scope));

  useEffect(() => {
    if (ready) viewCacheService.writeValue(key, value, scope);
  }, [key, value, ready, scope]);

  return ready || fallback === null ? value : fallback;
}
