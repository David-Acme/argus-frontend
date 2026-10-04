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
    user: READ,
    notification: READ_UPDATE,
  },
  guest: {
    camera: READ,
    user: READ,
    notification: READ_UPDATE,
  },
};

export function hasAccess(role: UserRole, table: TableName, permission: Permission): boolean {
  if (role === 'owner') return true;
  return TABLE_ACCESS[role][table]?.includes(permission) ?? false;
}

export type GuardAccess = {
  view: boolean;
  setMode: boolean;
  manageGuests: boolean;
  review: boolean;
};

export function guardAccessForRole(role: UserRole): GuardAccess {
  return {
    view: role === 'owner' || role === 'resident' || role === 'guard',
    setMode: role === 'owner' || role === 'resident',
    manageGuests: role === 'owner' || role === 'resident',
    review: role === 'owner',
  };
}

export type CameraActionAccess = {
  talk: boolean;
};

const CAMERA_ACTION_ACCESS: Record<UserRole, CameraActionAccess> = {
  owner: { talk: true },
  resident: { talk: true },
  guard: { talk: true },
  guest: { talk: false },
};

export function cameraActionAccessForRole(role: UserRole): CameraActionAccess {
  return CAMERA_ACTION_ACCESS[role];
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

export function sessionAccessForRole(role: UserRole): SessionAccess {
  return SESSION_ACCESS[role];
}
