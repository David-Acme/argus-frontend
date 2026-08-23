import type { Model } from '@nozbe/watermelondb';
import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditLogApplyResult, AuditPatch, SyncTableKey } from '@/core/types';
import { chunkedBatch, existingByServerId } from './sync-db-utils';
import { toAuditPatch } from './audit-log-patch';

/** Applies server-approved, field-level updates to the local sync database. */
class AuditLogProcessorService {
  async apply(entries: IAuditLogEntry[]): Promise<AuditLogApplyResult> {
    const grouped = new Map<SyncTableKey, AuditPatch[]>();

    for (const entry of entries) {
      const patch = toAuditPatch(entry);
      if (!patch || Object.keys(patch.props).length === 0) continue;
      const patches = grouped.get(patch.key) ?? [];
      patches.push(patch);
      grouped.set(patch.key, patches);
    }

    const affected: SyncTableKey[] = [];
    const missing = new Set<SyncTableKey>();
    for (const [key, patches] of grouped) {
      const existing = await existingByServerId(
        key,
        patches.map((patch) => patch.recordId),
      );
      const operations: (() => Model)[] = [];

      for (const patch of patches) {
        const record = existing.get(patch.recordId);
        if (!record) {
          missing.add(key);
          continue;
        }
        operations.push(() => record.prepareUpdate((row) => Object.assign(row, patch.props)));
      }

      if (operations.length === 0) continue;
      await chunkedBatch(operations);
      affected.push(key);
    }

    return { affected, missing: [...missing] };
  }
}

export const auditLogProcessorService = new AuditLogProcessorService();
