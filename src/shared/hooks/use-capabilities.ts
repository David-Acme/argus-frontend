import { useCallback, useMemo } from 'react';
import { useAuthStore, useLocaleStore } from '@/core/stores';
import type { AppAccess, TableName } from '@/core/types';
import { VIEW_CACHE_KEYS, type Capability } from '@/shared/constants';
import {
  accessView,
  cameraActionsOf,
  guardAccessOf,
  hasCapability,
  isModuleActive,
  tableAllowed,
  type AccessView,
  type CameraActionAccess,
  type GuardAccess,
} from '@/shared/libs/capabilities';
import type { Permission } from '@/shared/libs/role-access';
import { useViewCacheValue } from './use-cached-rows';

export type Capabilities = AccessView & {
  has: (capability: Capability) => boolean;
  moduleActive: (moduleId: string) => boolean;
  can: (table: TableName, permission: Permission) => boolean;
  isOwner: boolean;
  guard: GuardAccess;
  cameraActions: CameraActionAccess;
};

export function useAccessView(): AccessView {
  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const language = useLocaleStore((state) => state.language);
  const access = useViewCacheValue<AppAccess>(VIEW_CACHE_KEYS.appContext);
  return useMemo(() => accessView(access, userRole, language), [access, language, userRole]);
}

export function useCapabilities(): Capabilities {
  const view = useAccessView();
  const has = useCallback((capability: Capability) => hasCapability(view, capability), [view]);
  const moduleActive = useCallback((moduleId: string) => isModuleActive(view, moduleId), [view]);
  const can = useCallback((table: TableName, permission: Permission) => tableAllowed(view, table, permission), [view]);

  return useMemo(
    () => ({
      ...view,
      has,
      moduleActive,
      can,
      isOwner: view.role === 'owner' && view.roleActive,
      guard: guardAccessOf(view),
      cameraActions: cameraActionsOf(view),
    }),
    [can, has, moduleActive, view]
  );
}
