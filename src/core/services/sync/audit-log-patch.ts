import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditPatch, AuditPlan, AuditRemoval, SyncTableKey } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { toPartialModelProps } from './entity-mappers';
import { SYNC_TABLES_WITHOUT_DELETIONS } from './sync-constants';

export type { AuditPatch } from '@/core/types';

const REMOVAL_FIELD = 'deletedAt';

const isSyncTableKey = (value: string): value is SyncTableKey =>
  SYNC_TABLE_KEYS.includes(value as SyncTableKey);

const byId = (left: IAuditLogEntry, right: IAuditLogEntry): number =>
  Number(left.id) - Number(right.id);

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

export const toAuditRemoval = (entry: IAuditLogEntry): AuditRemoval | null => {
  if (!isSyncTableKey(entry.tableName) || !SYNC_TABLES_WITHOUT_DELETIONS.has(entry.tableName)) {
    return null;
  }
  const deleted = entry.changes[REMOVAL_FIELD]?.current;
  return deleted == null ? null : { key: entry.tableName, recordId: String(entry.recordId) };
};

export const planAuditEntries = (entries: readonly IAuditLogEntry[]): AuditPlan => {
  const patches = new Map<SyncTableKey, Map<string, AuditPatch>>();
  const removals = new Map<SyncTableKey, Set<string>>();

  for (const entry of [...entries].sort(byId)) {
    const removal = toAuditRemoval(entry);
    if (removal) {
      const removed = removals.get(removal.key) ?? new Set<string>();
      removed.add(removal.recordId);
      removals.set(removal.key, removed);
      patches.get(removal.key)?.delete(removal.recordId);
      continue;
    }
    const patch = toAuditPatch(entry);
    if (!patch || Object.keys(patch.props).length === 0) continue;
    if (removals.get(patch.key)?.has(patch.recordId)) continue;
    const byRecord = patches.get(patch.key) ?? new Map<string, AuditPatch>();
    const previous = byRecord.get(patch.recordId);
    byRecord.set(
      patch.recordId,
      previous ? { ...patch, props: { ...previous.props, ...patch.props } } : patch
    );
    patches.set(patch.key, byRecord);
  }

  return { patches, removals };
};
