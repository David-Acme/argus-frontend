import { moduleEngine } from '@/core/services/modules';
import { moduleOfApiPath } from '@/core/services/modules/module-state';
import { onRefusal } from '@/core/services/http';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { viewCacheService } from '@/core/services/view-cache.service';
import { useAuthStore } from '@/core/stores';
import type { AppAccess } from '@/core/types';
import { SYNC_OPERATION, VIEW_CACHE_KEYS } from '@/shared/constants';
import { ContextEngine } from './context-engine';

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

useAuthStore.subscribe((state) => {
  if (state.status === 'signed-out') contextEngine.stop();
});

export { accessOf, isStaleContext, withModuleOff } from './context-state';
export { ContextEngine, type ContextEngineDeps } from './context-engine';
