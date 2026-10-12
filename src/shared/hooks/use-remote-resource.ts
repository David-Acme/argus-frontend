import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createReloadGate, matchesResourceMatch, resourceMatchKey, resourceSignal } from '@/core/services/sync/resource-signal';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { IServiceResponse } from '@/core/interfaces';
import type { ResourceMatch, ViewCacheKey } from '@/core/types';
import { useViewCacheValue } from './use-cached-rows';

type RemoteResourceOptions<T> = {
  cacheKey: ViewCacheKey;
  scope?: string;
  load: () => Promise<IServiceResponse<T>>;
  enabled?: boolean;
  resources?: readonly ResourceMatch[];
};

export type RemoteResourceStatus = 'idle' | 'loading' | 'ready' | 'failed';

const NO_RESOURCES: readonly ResourceMatch[] = [];

export function useRemoteResource<T>({
  cacheKey,
  scope,
  load,
  enabled = true,
  resources = NO_RESOURCES,
}: RemoteResourceOptions<T>) {
  const data = useViewCacheValue<T>(cacheKey, scope);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(Date.now);
  const generation = useRef(0);
  const resourcesRef = useRef(resources);

  const run = useCallback(async () => {
    const current = generation.current + 1;
    generation.current = current;
    const result = await load();
    if (current !== generation.current) return;
    setFailed(!result.ok);
    if (!result.ok) return;
    viewCacheService.writeValue(cacheKey, result.info, scope);
    setLoadedAt(Date.now());
  }, [cacheKey, load, scope]);

  const gateRef = useRef<{ run: () => Promise<void>; reload: () => Promise<void> } | null>(null);

  const reload = useCallback((): Promise<void> => {
    if (gateRef.current?.run !== run) gateRef.current = { run, reload: createReloadGate(run) };
    return gateRef.current.reload();
  }, [run]);

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

  const resourceKey = resources.map(resourceMatchKey).join('|');

  useEffect(() => {
    resourcesRef.current = resources;
  }, [resources]);

  useEffect(() => {
    if (!enabled || resourceKey === '') return undefined;
    return resourceSignal.onChanged((notice) => {
      if (!matchesResourceMatch(resourcesRef.current, notice)) return;
      void reload();
    });
  }, [enabled, reload, resourceKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    return resourceSignal.onReconnected(() => {
      void reload();
    });
  }, [enabled, reload]);

  const status: RemoteResourceStatus = !enabled
    ? 'idle'
    : data != null
      ? 'ready'
      : failed
        ? 'failed'
        : 'loading';

  return { data: enabled ? data : null, status, loadedAt, reload, mutate };
}
