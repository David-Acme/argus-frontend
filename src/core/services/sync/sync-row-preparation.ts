import type { Model } from '@nozbe/watermelondb';
import { collection } from '@/core/database';
import type { SyncCreatedRows, SyncDeletedRows } from '@/core/types';
import { toDirtyRaw, toModelProps } from './entity-mappers';
import { existingByServerId, type PreparedOperation } from './sync-db-utils';

export type SyncCreateMode = 'upsert' | 'insert';

export async function prepareSyncRows(
  created: SyncCreatedRows,
  deleted: SyncDeletedRows,
  mode: SyncCreateMode
): Promise<PreparedOperation[]> {
  const operations: PreparedOperation[] = [];
  for (const [key, rows] of deleted) {
    if (rows.length === 0) continue;
    const existing = await existingByServerId(
      key,
      rows.map((row) => String(row.id))
    );
    existing.forEach((record) => operations.push(() => record.prepareDestroyPermanently()));
  }
  for (const [key, rows] of created) {
    if (rows.length === 0) continue;
    const removed = new Set((deleted.get(key) ?? []).map((row) => String(row.id)));
    const latest = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const id = String(row.id);
      if (!removed.has(id)) latest.set(id, row);
    }
    if (latest.size === 0) continue;
    const existing = await existingByServerId(key, [...latest.keys()]);
    for (const [id, row] of latest) {
      const record: Model | undefined = existing.get(id);
      if (!record) {
        operations.push(() => collection(key).prepareCreateFromDirtyRaw(toDirtyRaw(key, row)));
      } else if (mode === 'upsert') {
        operations.push(() =>
          record.prepareUpdate((model) => Object.assign(model, toModelProps(key, row)))
        );
      }
    }
  }
  return operations;
}
