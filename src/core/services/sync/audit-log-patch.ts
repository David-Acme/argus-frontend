import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditPatch, AuditPath, AuditPlan, AuditRemoval, SyncTableKey } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { sanitizeObject } from '@/core/database/tables/sanitizers';
import { isJsonProp, toPartialModelProps } from './entity-mappers';
import { SYNC_TABLES_WITHOUT_DELETIONS } from './sync-constants';

export type { AuditPatch } from '@/core/types';

const REMOVAL_FIELD = 'deletedAt';

const PATH_SEPARATOR = '.';

const isSyncTableKey = (value: string): value is SyncTableKey =>
  SYNC_TABLE_KEYS.includes(value as SyncTableKey);

const byId = (left: IAuditLogEntry, right: IAuditLogEntry): number =>
  Number(left.id) - Number(right.id);

export const toAuditPatch = (entry: IAuditLogEntry): AuditPatch | null => {
  if (!isSyncTableKey(entry.tableName)) return null;

  const key = entry.tableName;
  const currentValues: Record<string, unknown> = {};
  const paths: AuditPath[] = [];
  for (const [field, change] of Object.entries(entry.changes)) {
    if (!Object.prototype.hasOwnProperty.call(change, 'current')) continue;
    const [prop = '', ...path] = field.split(PATH_SEPARATOR);
    if (path.length === 0) currentValues[field] = change.current;
    else if (isJsonProp(key, prop)) paths.push({ prop, path, value: change.current });
  }

  return {
    id: entry.id,
    key,
    recordId: String(entry.recordId),
    props: toPartialModelProps(key, currentValues),
    paths,
  };
};

const copyOf = (value: unknown): Record<string, unknown> =>
  sanitizeObject(JSON.parse(JSON.stringify(sanitizeObject(value))) as unknown);

function setPath(root: Record<string, unknown>, path: readonly string[], value: unknown): void {
  const last = path.length - 1;
  let node = root;
  path.forEach((segment, index) => {
    if (index === last) {
      if (value === null || value === undefined) delete node[segment];
      else node[segment] = value;
      return;
    }
    const next = sanitizeObject(node[segment]);
    node[segment] = next;
    node = next;
  });
}

export const patchedProps = (
  patch: AuditPatch,
  read: (prop: string) => unknown
): Record<string, unknown> => {
  if (patch.paths.length === 0) return patch.props;
  const roots = new Map<string, Record<string, unknown>>();
  for (const { prop, path, value } of patch.paths) {
    const root =
      roots.get(prop) ?? copyOf(Object.hasOwn(patch.props, prop) ? patch.props[prop] : read(prop));
    setPath(root, path, value);
    roots.set(prop, root);
  }
  return { ...patch.props, ...toPartialModelProps(patch.key, Object.fromEntries(roots)) };
};

const mergePatches = (previous: AuditPatch, next: AuditPatch): AuditPatch => ({
  ...next,
  props: { ...previous.props, ...next.props },
  paths: [...previous.paths.filter((path) => !Object.hasOwn(next.props, path.prop)), ...next.paths],
});

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
    if (!patch || (Object.keys(patch.props).length === 0 && patch.paths.length === 0)) continue;
    if (removals.get(patch.key)?.has(patch.recordId)) continue;
    const byRecord = patches.get(patch.key) ?? new Map<string, AuditPatch>();
    const previous = byRecord.get(patch.recordId);
    byRecord.set(patch.recordId, previous ? mergePatches(previous, patch) : patch);
    patches.set(patch.key, byRecord);
  }

  return { patches, removals };
};
