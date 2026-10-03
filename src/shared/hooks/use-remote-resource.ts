import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { IServiceResponse } from '@/core/interfaces';
import type { ViewCacheKey } from '@/core/types';
import { useViewCacheValue } from './use-cached-rows';

type RemoteResourceOptions<T> = {
  cacheKey: ViewCacheKey;
  scope?: string;
  load: () => Promise<IServiceResponse<T>>;
  enabled?: boolean;
};

export type RemoteResourceStatus = 'idle' | 'loading' | 'ready' | 'failed';

export function useRemoteResource<T>({ cacheKey, scope, load, enabled = true }: RemoteResourceOptions<T>) {
  const data = useViewCacheValue<T>(cacheKey, scope);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(Date.now);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const current = generation.current + 1;
    generation.current = current;
    const result = await load();
    if (current !== generation.current) return;
    setFailed(!result.ok);
    if (!result.ok) return;
    viewCacheService.writeValue(cacheKey, result.info, scope);
    setLoadedAt(Date.now());
  }, [cacheKey, load, scope]);

  const mutate = useCallback(
    (update: (previous: T | null) => T | null) => {
      generation.current += 1;
      viewCacheService.writeValue(cacheKey, update(viewCacheService.readValue<T>(cacheKey, scope)), scope);
    },
    [cacheKey, scope],
  );

  useFocusEffect(
    useCallback(() => {
      if (enabled) void reload();
    }, [enabled, reload]),
  );

  const status: RemoteResourceStatus = !enabled
    ? 'idle'
    : data != null
      ? 'ready'
      : failed
        ? 'failed'
        : 'loading';

  return { data: enabled ? data : null, status, loadedAt, reload, mutate };
}
