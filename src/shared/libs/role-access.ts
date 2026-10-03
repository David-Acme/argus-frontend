import type { TableName, UserRole } from '@/core/types';

export type Permission = 'read' | 'create' | 'update' | 'delete';

const FULL: Permission[] = ['read', 'create', 'update', 'delete'];
const READ: Permission[] = ['read'];
const READ_UPDATE: Permission[] = ['read', 'update'];

const TABLE_ACCESS: Record<UserRole, Partial<Record<TableName, Permission[]>>> = {
  owner: {},
  resident: {
    camera: FULL,
    camera_stream: FULL,
    zone: FULL,
    reminder: FULL,
    reminder_detail: FULL,
    calendar_event: FULL,
    calendar_event_share: FULL,
    project: FULL,
    project_member: FULL,
    project_task: FULL,
    event: FULL,
    person: FULL,
    user: READ,
    notification: READ_UPDATE,
  },
  guard: {
    camera: READ,
    camera_stream: READ,
    zone: READ,
    event: READ,
    person: READ,
    notification: READ_UPDATE,
  },
  guest: {
    camera: READ,
    notification: READ_UPDATE,
  },
};

export function hasAccess(role: UserRole, table: TableName, permission: Permission): boolean {
  if (role === 'owner') return true;
  return TABLE_ACCESS[role][table]?.includes(permission) ?? false;
}

export function readableTables(role: UserRole): TableName[] {
  if (role === 'owner') return Object.keys(TABLE_ACCESS.resident) as TableName[];
  return (Object.keys(TABLE_ACCESS[role]) as TableName[]).filter((table) =>
    hasAccess(role, table, 'read')
  );
}
