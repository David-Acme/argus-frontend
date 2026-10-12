import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createReloadGate, resourceSignal } from '@/core/services/sync/resource-signal';
import { viewCacheService } from '@/core/services/view-cache.service';
import type { IServiceResponse } from '@/core/interfaces';
import type { ResourceDomain, ViewCacheKey } from '@/core/types';
import { useViewCacheValue } from './use-cached-rows';

type RemoteResourceOptions<T> = {
  cacheKey: ViewCacheKey;
  scope?: string;
  load: () => Promise<IServiceResponse<T>>;
  enabled?: boolean;
  domains?: readonly ResourceDomain[];
};

export type RemoteResourceStatus = 'idle' | 'loading' | 'ready' | 'failed';

const NO_DOMAINS: readonly ResourceDomain[] = [];

export function useRemoteResource<T>({
  cacheKey,
  scope,
  load,
  enabled = true,
  domains = NO_DOMAINS,
}: RemoteResourceOptions<T>) {
  const data = useViewCacheValue<T>(cacheKey, scope);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(Date.now);
  const generation = useRef(0);
  const domainsRef = useRef(domains);

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

  const domainKey = domains.join('|');

  useEffect(() => {
    domainsRef.current = domains;
  }, [domains]);

  useEffect(() => {
    if (!enabled || domainKey === '') return undefined;
    return resourceSignal.onChanged((notice) => {
      if (!domainsRef.current.includes(notice.domain)) return;
      void reload();
    });
  }, [domainKey, enabled, reload]);

  useEffect(() => {
    if (!enabled || domainKey === '') return undefined;
    return resourceSignal.onReconnected(() => {
      void reload();
    });
  }, [domainKey, enabled, reload]);

  const status: RemoteResourceStatus = !enabled
    ? 'idle'
    : data != null
      ? 'ready'
      : failed
        ? 'failed'
        : 'loading';

  return { data: enabled ? data : null, status, loadedAt, reload, mutate };
}
