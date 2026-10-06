import { AppState } from 'react-native';
import { onRefusal } from '@/core/services/http';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { useAuthStore } from '@/core/stores';
import type { ModuleCatalog } from '@/core/types';
import { MODULE_POLL_MS, MODULE_PURGE_STAMPS_KEY, SYNC_OPERATION, VIEW_CACHE_KEYS } from '@/shared/constants';
import { storageService } from '@/core/services/storage';
import { ModuleEngine } from './module-engine';
import { syncTablesOf } from './module-state';
import { modulesService } from './modules.service';

export const moduleEngine = new ModuleEngine({
  load: () => modulesService.list(),
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
    onConnect: (listener) => synchronizeService.onConnect(listener),
    onDisconnect: (listener) => synchronizeService.onDisconnect(listener),
    isConnected: () => synchronizeService.isSocketConnected,
  },
  onForeground: (listener) => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') listener();
    });
    return () => subscription.remove();
  },
  onRefusal: (listener) => onRefusal((path) => listener(path)),
  setTimer: (run, ms) => setTimeout(run, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
  pollMs: MODULE_POLL_MS,
});

useAuthStore.subscribe((state) => {
  if (state.status === 'signed-out') moduleEngine.stop();
});

export { modulesService } from './modules.service';
export { ModuleEngine, type ModuleEngineDeps } from './module-engine';
export {
  bytesToFetch,
  enabledModuleIds,
  installPlan,
  isJobOpen,
  isJobRunning,
  isModuleEnabled,
  moduleOfApiPath,
  moduleOfAppRoute,
  requiredBy,
  runningModules,
  type InstallPlan,
} from './module-state';
