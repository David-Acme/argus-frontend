import { log } from '@/core/services/log';
import { moduleEngine } from '@/core/services/modules';
import { moduleOfApiPath } from '@/core/services/modules/module-state';
import { netService } from '@/core/services/net';
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
  remote: {
    remember: (remote) => {
      netService.rememberRemote(remote).catch((error: unknown) => {
        log.error('net', 'the home id was not kept; the next context brings it again', error);
      });
    },
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
  viewCacheCoordinatorService.setHouseholdZone(access.timeZone ?? null);
  if (gained.length > 0) void synchronizeService.syncOnce();
});

export function applyCachedAccess(): void {
  const access = contextEngine.current();
  known = activeModulesOf(access);
  viewCacheCoordinatorService.setActiveModules(known);
  viewCacheCoordinatorService.setHouseholdZone(access?.timeZone ?? null);
}

useAuthStore.subscribe((state) => {
  if (state.status !== 'signed-out') return;
  contextEngine.stop();
  known = null;
  viewCacheCoordinatorService.setActiveModules(null);
  viewCacheCoordinatorService.setHouseholdZone(null);
});

export { accessOf, activeModulesOf, gainedModules, isStaleContext, withModuleOff } from './context-state';
export { ContextEngine, type ContextEngineDeps } from './context-engine';
