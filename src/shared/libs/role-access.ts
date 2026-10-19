import type { TableName, UserRole } from '@/core/types';

export type Permission = 'read' | 'create' | 'update' | 'delete';

const FULL: Permission[] = ['read', 'create', 'update', 'delete'];
const READ: Permission[] = ['read'];
const READ_UPDATE_DELETE: Permission[] = ['read', 'update', 'delete'];

const TABLE_ACCESS: Record<UserRole, Partial<Record<TableName, Permission[]>>> = {
  owner: {},
  resident: {
    camera: FULL,
    zone: FULL,
    reminder: FULL,
    calendar_event: FULL,
    calendar_event_share: FULL,
    project: FULL,
    project_member: FULL,
    project_task: FULL,
    person: FULL,
    user: READ,
    notification: READ_UPDATE_DELETE,
    conversation_message: READ_UPDATE_DELETE,
  },
  guard: {
    reminder: FULL,
    camera: READ,
    zone: READ,
    person: READ,
    user: READ,
    notification: READ_UPDATE_DELETE,
    conversation_message: READ_UPDATE_DELETE,
  },
  guest: {
    reminder: FULL,
    camera: READ,
    user: READ,
    notification: READ_UPDATE_DELETE,
    conversation_message: READ_UPDATE_DELETE,
  },
};

export type ClipAccess = {
  view: boolean;
  remove: boolean;
};

const NO_CLIPS: ClipAccess = { view: false, remove: false };

const CLIP_ACCESS: Record<UserRole, ClipAccess> = {
  owner: { view: true, remove: true },
  resident: NO_CLIPS,
  guard: { view: true, remove: false },
  guest: NO_CLIPS,
};

export function clipAccessForRole(role: UserRole, roleActive: boolean): ClipAccess {
  const access = CLIP_ACCESS[role] ?? NO_CLIPS;
  return roleActive || role === 'owner' ? access : NO_CLIPS;
}

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
