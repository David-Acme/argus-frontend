import { useCallback, useMemo } from 'react';
import { useAuthStore, useLocaleStore } from '@/core/stores';
import type { AppAccess, TableName, UserRole } from '@/core/types';
import { VIEW_CACHE_KEYS, type Capability } from '@/shared/constants';
import {
  accessView,
  cameraActionsOf,
  guardAccessOf,
  hasAnyCapability,
  hasCapability,
  isModuleActive,
  peopleAccessOf,
  tableAllowed,
  type AccessView,
  type CameraActionAccess,
  type GuardAccess,
  type PeopleAccess,
} from '@/shared/libs/capabilities';
import type { Permission } from '@/shared/libs/role-access';
import { useViewCacheValue } from './use-cached-rows';

export type Capabilities = AccessView & {
  has: (capability: Capability) => boolean;
  hasAny: (capabilities: readonly Capability[]) => boolean;
  moduleActive: (moduleId: string) => boolean;
  can: (table: TableName, permission: Permission) => boolean;
  canRead: (table: TableName) => boolean;
  canWrite: (table: TableName) => boolean;
  isOwner: boolean;
  isRole: (role: UserRole) => boolean;
  guard: GuardAccess;
  people: PeopleAccess;
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
  const hasAny = useCallback((capabilities: readonly Capability[]) => hasAnyCapability(view, capabilities), [view]);
  const moduleActive = useCallback((moduleId: string) => isModuleActive(view, moduleId), [view]);
  const can = useCallback((table: TableName, permission: Permission) => tableAllowed(view, table, permission), [view]);

  return useMemo(
    () => ({
      ...view,
      has,
      hasAny,
      moduleActive,
      can,
      canRead: (table: TableName) => can(table, 'read'),
      canWrite: (table: TableName) => can(table, 'create') || can(table, 'update'),
      isOwner: view.role === 'owner' && view.roleActive,
      isRole: (role: UserRole) => view.role === role && view.roleActive,
      guard: guardAccessOf(view),
      people: peopleAccessOf(view),
      cameraActions: cameraActionsOf(view),
    }),
    [can, has, hasAny, moduleActive, view]
  );
}
