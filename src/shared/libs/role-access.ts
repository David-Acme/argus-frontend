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
    reminder: FULL,
    reminder_detail: FULL,
    camera: READ,
    camera_stream: READ,
    zone: READ,
    event: READ,
    person: READ,
    user: READ,
    notification: READ_UPDATE,
  },
  guest: {
    reminder: FULL,
    reminder_detail: FULL,
    camera: READ,
    user: READ,
    notification: READ_UPDATE,
  },
};

export function hasAccess(role: UserRole, table: TableName, permission: Permission): boolean {
  if (role === 'owner') return true;
  return TABLE_ACCESS[role]?.[table]?.includes(permission) ?? false;
}

export type SessionAccess = {
  view: boolean;
  revoke: boolean;
  manageOthers: boolean;
};

const OWN_SESSIONS: SessionAccess = { view: true, revoke: true, manageOthers: false };

const SESSION_ACCESS: Record<UserRole, SessionAccess> = {
  owner: { view: true, revoke: true, manageOthers: true },
  resident: OWN_SESSIONS,
  guard: OWN_SESSIONS,
  guest: OWN_SESSIONS,
};

const NO_SESSIONS: SessionAccess = { view: false, revoke: false, manageOthers: false };

export function sessionAccessForRole(role: UserRole): SessionAccess {
  return SESSION_ACCESS[role] ?? NO_SESSIONS;
}
