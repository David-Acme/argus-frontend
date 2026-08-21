import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/core/stores';
import type { TableName, UserRole } from '@/core/types';
import { hasAccess, type Permission } from '@/shared/libs/role-access';

type UsePermissionsResult = {
  role: UserRole;
  can: (table: TableName, permission: Permission) => boolean;
  canRead: (table: TableName) => boolean;
  canWrite: (table: TableName) => boolean;
};

/** Role of the signed-in user plus the checks the UI needs to hide dead controls. */
export function usePermissions(): UsePermissionsResult {
  const role = useAuthStore((state) => state.user?.role) ?? 'guest';

  const can = useCallback(
    (table: TableName, permission: Permission) => hasAccess(role, table, permission),
    [role],
  );

  return useMemo(
    () => ({
      role,
      can,
      canRead: (table: TableName) => can(table, 'read'),
      canWrite: (table: TableName) => can(table, 'create') || can(table, 'update'),
    }),
    [can, role],
  );
}
