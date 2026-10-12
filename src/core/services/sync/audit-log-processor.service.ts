import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditLogApplyResult, AuditLogRecordUpdate, AuditPatch, SyncTableKey } from '@/core/types';
import { database } from '@/core/database';
import { optimisticRegistry } from '@/shared/libs/optimistic';
import { batchPrepared, existingByServerId, type PreparedOperation } from './sync-db-utils';
import { toAuditPatch } from './audit-log-patch';

export type PreparedAuditLogs = AuditLogApplyResult & {
  operations: PreparedOperation[];
  updated: AuditLogRecordUpdate[];
};

const byId = (left: IAuditLogEntry, right: IAuditLogEntry): number =>
  Number(left.id) - Number(right.id);

class AuditLogProcessorService {
  async prepare(entries: IAuditLogEntry[]): Promise<PreparedAuditLogs> {
    const grouped = new Map<SyncTableKey, Map<string, AuditPatch>>();

    for (const entry of [...entries].sort(byId)) {
      const patch = toAuditPatch(entry);
      if (!patch || Object.keys(patch.props).length === 0) continue;
      const patches = grouped.get(patch.key) ?? new Map<string, AuditPatch>();
      const previous = patches.get(patch.recordId);
      patches.set(
        patch.recordId,
        previous ? { ...patch, props: { ...previous.props, ...patch.props } } : patch
      );
      grouped.set(patch.key, patches);
    }

    const operations: PreparedOperation[] = [];
    const affected: SyncTableKey[] = [];
    const missing = new Set<SyncTableKey>();
    const updated: AuditLogRecordUpdate[] = [];
    for (const [key, patches] of grouped) {
      const existing = await existingByServerId(key, [...patches.keys()]);
      let touched = false;
      for (const patch of patches.values()) {
        const record = existing.get(patch.recordId);
        if (!record) {
          missing.add(key);
          continue;
        }
        touched = true;
        updated.push({ table: key, recordId: patch.recordId });
        operations.push(() => record.prepareUpdate((row) => Object.assign(row, patch.props)));
      }
      if (touched) affected.push(key);
    }

    return { operations, affected, missing: [...missing], updated };
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
