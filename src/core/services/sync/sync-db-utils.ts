import { Q, type Model } from '@nozbe/watermelondb';
import { collection, database } from '@/core/database';
import type { SyncTableKey } from '@/core/types';
import { SYNC_BATCH_SIZE } from './sync-constants';

export async function chunkedBatch(operations: (() => Model)[]): Promise<void> {
  for (let i = 0; i < operations.length; i += SYNC_BATCH_SIZE) {
    const chunk = operations.slice(i, i + SYNC_BATCH_SIZE);
    await database.write(async () => {
      await database.batch(...chunk.map((op) => op()));
    });
  }
}

export async function existingByServerId(
  key: SyncTableKey,
  ids: string[],
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
