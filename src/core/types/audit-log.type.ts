import type { SyncTableKey } from './sync.type';

export type AuditLogCursor = {
  lastId: number;
  watermarkId: number;
};

export type AuditLogScope = 'global' | 'user';

export type AuditLogCursors = Partial<Record<AuditLogScope, AuditLogCursor>>;

export type AuditLogRequest = {
  afterId?: number;
  endId?: number;
  findLast?: boolean;
};

export type AuditLogRow = {
  id: number;
};

export type AuditPatch = {
  id: number;
  key: SyncTableKey;
  recordId: string;
  props: Record<string, unknown>;
};

export type AuditLogApplyResult = {
  affected: SyncTableKey[];
  missing: SyncTableKey[];
};
