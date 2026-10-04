import type { ISyncDeletedRow } from '@/core/interfaces';
import type { UserRole } from './database.type';

export const SYNC_TABLE_KEYS = [
  'user',
  'user_invitation',
  'camera',
  'camera_stream',
  'zone',
  'reminder',
  'reminder_detail',
  'calendar_event',
  'calendar_event_share',
  'project',
  'project_member',
  'project_task',
  'event',
  'person',
  'notification',
] as const;

export type SyncTableKey = (typeof SYNC_TABLE_KEYS)[number];

export type SyncTableCursor = {
  createdStart?: number;
  createdId?: number | string;
  deletedStart?: number;
  deletedId?: number | string;
  deletedBaseline?: boolean;
  projection?: number;
};

export type SyncCursors = {
  [key in SyncTableKey]?: SyncTableCursor;
};

export type GrantScopeKey = 'project' | 'calendar_event';

export type PendingGrantScopes = {
  [key in GrantScopeKey]?: string[];
};

export type SyncCreatedRows = Map<SyncTableKey, Record<string, unknown>[]>;

export type SyncDeletedRows = Map<SyncTableKey, ISyncDeletedRow[]>;

export type SyncUserPatch = {
  id?: number;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
};
