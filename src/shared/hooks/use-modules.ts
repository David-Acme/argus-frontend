import { useEffect, useMemo } from 'react';
import { enabledModuleIds, isModuleEnabled, moduleEngine } from '@/core/services/modules';
import { useAuthStore } from '@/core/stores';
import type { ModuleCatalog } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from './use-cached-rows';

export function useModuleCatalog(): ModuleCatalog | null {
  const userId = useAuthStore((state) => (state.status === 'signed-in' ? (state.user?.id ?? null) : null));
  const catalog = useViewCacheValue<ModuleCatalog>(VIEW_CACHE_KEYS.moduleCatalog);

  useEffect(() => {
    if (userId !== null) moduleEngine.start(String(userId));
  }, [userId]);

  return userId === null ? null : catalog;
}

export function useEnabledModules(): ReadonlySet<string> | null {
  const catalog = useModuleCatalog();
  return useMemo(() => enabledModuleIds(catalog), [catalog]);
}

export function useModuleEnabled(moduleId: string): boolean {
  return isModuleEnabled(useEnabledModules(), moduleId);
}
