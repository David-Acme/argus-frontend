import { Q, type Model } from '@nozbe/watermelondb';
import { collection, database } from '@/core/database';
import { SYNC_BATCH_SIZE } from '@/shared/constants';
import { GRANT_RULES, type GrantRule } from './grant-scope';
import { batchPrepared, type PreparedOperation } from './sync-db-utils';

async function revokedParents(rule: GrantRule, userId: string): Promise<Model[]> {
  const parents = await collection(rule.scope)
    .query(Q.where('owner_id', Q.notEq(userId)))
    .fetch();
  if (parents.length === 0) return [];
  const grants = await collection(rule.grant).query(Q.where('user_id', userId)).fetch();
  const held = new Set(
    grants.map((grant) => String((grant._raw as Record<string, unknown>)[rule.grantParentColumn]))
  );
  return parents.filter((parent) => !held.has(parent.id));
}

async function cascadeOf(rule: GrantRule, parentIds: string[]): Promise<Model[]> {
  const rows: Model[] = [];
  for (const { table, column } of rule.cascade) {
    for (let i = 0; i < parentIds.length; i += SYNC_BATCH_SIZE) {
      const chunk = parentIds.slice(i, i + SYNC_BATCH_SIZE);
      rows.push(...(await collection(table).query(Q.where(column, Q.oneOf(chunk))).fetch()));
    }
  }
  return rows;
}

export async function sweepRevokedGrants(userId: string | null): Promise<number> {
  if (!userId) return 0;
  return database.write(async () => {
    const operations: PreparedOperation[] = [];
    for (const rule of GRANT_RULES) {
      const revoked = await revokedParents(rule, userId);
      if (revoked.length === 0) continue;
      const dependents = await cascadeOf(
        rule,
        revoked.map((parent) => parent.id)
      );
      for (const record of [...dependents, ...revoked]) {
        operations.push(() => record.prepareDestroyPermanently());
      }
    }
    await batchPrepared(operations);
    return operations.length;
  });
}
