import { useMemo } from 'react';
import { localizedCatalog } from '@/core/services/modules/module-text';
import { useAuthStore, useLocaleStore } from '@/core/stores';
import type { ModuleCatalog } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';

export function useModuleCatalog(): ModuleCatalog | null {
  const signedIn = useAuthStore((state) => state.status === 'signed-in');
  const language = useLocaleStore((state) => state.language);
  const catalog = useViewCacheValue<ModuleCatalog>(VIEW_CACHE_KEYS.moduleCatalog);
  return useMemo(() => (signedIn ? localizedCatalog(catalog, language) : null), [catalog, language, signedIn]);
}
