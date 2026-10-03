import type { IAuditLogEntry, ISocketEmitDto, ISyncDeletedRow } from '@/core/interfaces';
import type {
  AuditLogCursors,
  AuditLogScope,
  SyncCreatedRows,
  SyncDeletedRows,
  SyncTableKey,
} from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { SYNC_OPERATION } from '@/shared/constants';
import { SYNC_AUDIT_SCOPES } from './sync-constants';

export type LiveAuditLogs = Record<AuditLogScope, IAuditLogEntry[]>;

export type LiveAuditHigh = Record<AuditLogScope, number>;

export const emptyLiveAuditHigh = (): LiveAuditHigh => ({ global: 0, user: 0 });

export const syncTableKeyOf = (option: string): SyncTableKey | null =>
  SYNC_TABLE_KEYS.includes(option as SyncTableKey) ? (option as SyncTableKey) : null;

export const groupLiveEvents = (
  events: ISocketEmitDto[]
): { created: SyncCreatedRows; deleted: SyncDeletedRows; logs: LiveAuditLogs } => {
  const created: SyncCreatedRows = new Map();
  const deleted: SyncDeletedRows = new Map();
  const logs: LiveAuditLogs = { global: [], user: [] };

  for (const event of events) {
    if (event.operation === SYNC_OPERATION.Log) {
      logs[event.option === 'user_audit_log' ? 'user' : 'global'].push(
        event.info as IAuditLogEntry
      );
      continue;
    }
    const key = syncTableKeyOf(event.option);
    if (!key) continue;
    if (event.operation === SYNC_OPERATION.Add) {
      const rows = created.get(key) ?? [];
      rows.push(event.info as Record<string, unknown>);
      created.set(key, rows);
    } else if (event.operation === SYNC_OPERATION.Delete) {
      const rows = deleted.get(key) ?? [];
      rows.push(event.info as ISyncDeletedRow);
      deleted.set(key, rows);
    }
  }
  return { created, deleted, logs };
};

export const freshLiveAuditEntries = (
  logs: LiveAuditLogs,
  cursors: AuditLogCursors,
  high: LiveAuditHigh
): { entries: IAuditLogEntry[]; high: LiveAuditHigh } => {
  const next: LiveAuditHigh = { ...high };
  const entries: IAuditLogEntry[] = [];
  for (const scope of SYNC_AUDIT_SCOPES) {
    let floor = Math.max(cursors[scope]?.lastId ?? 0, high[scope]);
    const ordered = [...logs[scope]].sort((left, right) => Number(left.id) - Number(right.id));
    for (const entry of ordered) {
      const id = Number(entry.id);
      if (!Number.isFinite(id) || id <= floor) continue;
      floor = id;
      entries.push(entry);
    }
    next[scope] = floor;
  }
  return { entries, high: next };
};
