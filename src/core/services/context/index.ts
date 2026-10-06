import { moduleEngine } from '@/core/services/modules';
import { moduleOfApiPath } from '@/core/services/modules/module-state';
import { onRefusal } from '@/core/services/http';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { useAuthStore } from '@/core/stores';
import type { AppAccess } from '@/core/types';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { SYNC_OPERATION, VIEW_CACHE_KEYS } from '@/shared/constants';
import { ContextEngine } from './context-engine';
import { activeModulesOf, gainedModules } from './context-state';

export const contextEngine = new ContextEngine({
  cache: {
    read: () => viewCacheService.valueSnapshot<AppAccess>(VIEW_CACHE_KEYS.appContext),
    write: (access) => viewCacheService.writeValue(VIEW_CACHE_KEYS.appContext, access),
  },
  modules: {
    applyContext: (context) => moduleEngine.applyContext(context),
    moduleOfPath: moduleOfApiPath,
  },
  socket: {
    onInitialInfo: (listener) => synchronizeService.on(SYNC_OPERATION.InitialInfo, (frame) => listener(frame.info)),
    onContextUpdate: (listener) => synchronizeService.on(SYNC_OPERATION.ContextUpdate, (frame) => listener(frame.info)),
  },
  onRefusal: (listener) => onRefusal((path) => listener(path)),
  now: () => Date.now(),
});

let known = activeModulesOf(null);

contextEngine.onChange((access) => {
  const active = activeModulesOf(access);
  const gained = gainedModules(known, active);
  known = active;
  viewCacheCoordinatorService.setActiveModules(active);
  if (gained.length > 0) void synchronizeService.syncOnce();
});

export function applyCachedAccess(): void {
  known = activeModulesOf(contextEngine.current());
  viewCacheCoordinatorService.setActiveModules(known);
}

useAuthStore.subscribe((state) => {
  if (state.status !== 'signed-out') return;
  contextEngine.stop();
  known = null;
  viewCacheCoordinatorService.setActiveModules(null);
});

export { accessOf, activeModulesOf, gainedModules, isStaleContext, withModuleOff } from './context-state';
export { ContextEngine, type ContextEngineDeps } from './context-engine';
