import { getLanguage } from '@/core/i18n';
import { onRefusal } from '@/core/services/http';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { useAuthStore } from '@/core/stores';
import type { ModuleCatalog } from '@/core/types';
import { MODULE_PURGE_STAMPS_KEY, SYNC_OPERATION, VIEW_CACHE_KEYS } from '@/shared/constants';
import { storageService } from '@/core/services/storage';
import { ModuleEngine } from './module-engine';
import { syncTablesOf } from './module-state';
import { modulesService } from './modules.service';

export const moduleEngine = new ModuleEngine({
  act: (id, action, body) => modulesService.act(id, action, body),
  purges: {
    read: (session) => storageService.getObject<Record<string, number>>(`${MODULE_PURGE_STAMPS_KEY}${session}`) ?? {},
    write: (session, stamps) => storageService.setObject(`${MODULE_PURGE_STAMPS_KEY}${session}`, stamps),
  },
  dropModuleData: (moduleIds) => synchronizeService.dropTables(syncTablesOf(moduleIds)),
  cache: {
    read: () => viewCacheService.valueSnapshot<ModuleCatalog>(VIEW_CACHE_KEYS.moduleCatalog),
    write: (catalog) => viewCacheService.writeValue(VIEW_CACHE_KEYS.moduleCatalog, catalog),
  },
  socket: {
    onFrame: (listener) => synchronizeService.on(SYNC_OPERATION.ModuleUpdate, (frame) => listener(frame.info)),
  },
  onRefusal: (listener) => onRefusal((path) => listener(path)),
  now: () => Date.now(),
  language: getLanguage,
});

useAuthStore.subscribe((state) => {
  if (state.status === 'signed-out') moduleEngine.stop();
});

export { modulesService } from './modules.service';
export { ModuleEngine, type ModuleEngineDeps } from './module-engine';
export {
  bytesToFetch,
  installPlan,
  isJobOpen,
  isJobRunning,
  moduleOfApiPath,
  moduleOfAppRoute,
  requiredBy,
  runningModules,
  type InstallPlan,
} from './module-state';
