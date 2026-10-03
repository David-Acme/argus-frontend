import { Q, type Model } from '@nozbe/watermelondb';
import { collection, database } from '@/core/database';
import { SYNC_BATCH_SIZE } from '@/shared/constants';
import type { SyncTableKey } from '@/core/types';

export type PreparedOperation = () => Model;

export async function batchPrepared(operations: PreparedOperation[]): Promise<void> {
  for (let i = 0; i < operations.length; i += SYNC_BATCH_SIZE) {
    const chunk = operations.slice(i, i + SYNC_BATCH_SIZE);
    await database.batch(...chunk.map((op) => op()));
  }
}

export async function existingByServerId(
  key: SyncTableKey,
  ids: string[]
): Promise<Map<string, Model>> {
  const found = new Map<string, Model>();
  for (let i = 0; i < ids.length; i += SYNC_BATCH_SIZE) {
    const chunk = ids.slice(i, i + SYNC_BATCH_SIZE);
    const rows = await collection(key)
      .query(Q.where('id', Q.oneOf(chunk)))
      .fetch();
    for (const row of rows) found.set(row.id, row);
  }
  return found;
}

export async function destroyAllRows(keys: readonly SyncTableKey[]): Promise<void> {
  for (const key of keys) {
    for (;;) {
      const records = await collection(key).query(Q.take(SYNC_BATCH_SIZE)).fetch();
      if (records.length === 0) break;
      await database.write(async () => {
        await database.batch(...records.map((record) => record.prepareDestroyPermanently()));
      });
    }
  }
}
