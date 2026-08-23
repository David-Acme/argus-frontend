import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditPatch, SyncTableKey } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { toPartialModelProps } from './entity-mappers';

export type { AuditPatch } from '@/core/types';

const isSyncTableKey = (value: string): value is SyncTableKey =>
  SYNC_TABLE_KEYS.includes(value as SyncTableKey);

export const toAuditPatch = (entry: IAuditLogEntry): AuditPatch | null => {
  if (!isSyncTableKey(entry.tableName)) return null;

  const currentValues: Record<string, unknown> = {};
  for (const [field, change] of Object.entries(entry.changes)) {
    if (Object.prototype.hasOwnProperty.call(change, 'current')) {
      currentValues[field] = change.current;
    }
  }

  return {
    id: entry.id,
    key: entry.tableName,
    recordId: String(entry.recordId),
    props: toPartialModelProps(entry.tableName, currentValues),
  };
};
