import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditLogApplyResult, AuditLogRecordUpdate, SyncTableKey } from '@/core/types';
import { database } from '@/core/database';
import { optimisticRegistry } from '@/shared/libs/optimistic';
import { batchPrepared, existingByServerId, type PreparedOperation } from './sync-db-utils';
import { planAuditEntries } from './audit-log-patch';

export type PreparedAuditLogs = AuditLogApplyResult & {
  operations: PreparedOperation[];
  updated: AuditLogRecordUpdate[];
};

class AuditLogProcessorService {
  async prepare(entries: IAuditLogEntry[]): Promise<PreparedAuditLogs> {
    const { patches, removals } = planAuditEntries(entries);

    const operations: PreparedOperation[] = [];
    const affected = new Set<SyncTableKey>();
    const missing = new Set<SyncTableKey>();
    const updated: AuditLogRecordUpdate[] = [];
    for (const [key, byRecord] of patches) {
      const existing = await existingByServerId(key, [...byRecord.keys()]);
      for (const patch of byRecord.values()) {
        const record = existing.get(patch.recordId);
        if (!record) {
          missing.add(key);
          continue;
        }
        affected.add(key);
        updated.push({ table: key, recordId: patch.recordId });
        operations.push(() => record.prepareUpdate((row) => Object.assign(row, patch.props)));
      }
    }
    for (const [key, recordIds] of removals) {
      const existing = await existingByServerId(key, [...recordIds]);
      for (const [recordId, record] of existing) {
        affected.add(key);
        updated.push({ table: key, recordId });
        operations.push(() => record.prepareDestroyPermanently());
      }
    }

    return { operations, affected: [...affected], missing: [...missing], updated };
  }

  apply(entries: IAuditLogEntry[]): Promise<AuditLogApplyResult> {
    return database.write(async () => {
      const { operations, affected, missing, updated } = await this.prepare(entries);
      await batchPrepared(operations);
      if (updated.length > 0) optimisticRegistry.serverRows(updated);
      return { affected, missing };
    });
  }
}

export const auditLogProcessorService = new AuditLogProcessorService();
