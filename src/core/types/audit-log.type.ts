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

export type AuditPath = {
  prop: string;
  path: readonly string[];
  value: unknown;
};

export type AuditPatch = {
  id: number;
  key: SyncTableKey;
  recordId: string;
  props: Record<string, unknown>;
  paths: readonly AuditPath[];
};

export type AuditLogApplyResult = {
  affected: SyncTableKey[];
  missing: SyncTableKey[];
};

export type AuditLogRecordUpdate = {
  table: SyncTableKey;
  recordId: string;
};

export type AuditRemoval = {
  key: SyncTableKey;
  recordId: string;
};

export type AuditPlan = {
  patches: Map<SyncTableKey, Map<string, AuditPatch>>;
  removals: Map<SyncTableKey, Set<string>>;
};
