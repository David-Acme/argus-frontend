import type { IAuditLogEntry } from '@/core/interfaces';
import type { AuditLogApplyResult, AuditPatch, SyncTableKey } from '@/core/types';
import { chunkedBatch, existingByServerId, type PreparedOperation } from './sync-db-utils';
import { toAuditPatch } from './audit-log-patch';

export type PreparedAuditLogs = AuditLogApplyResult & {
  operations: PreparedOperation[];
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
        operations.push(() => record.prepareUpdate((row) => Object.assign(row, patch.props)));
      }
      if (touched) affected.push(key);
    }

    return { operations, affected, missing: [...missing] };
  }

  async apply(entries: IAuditLogEntry[]): Promise<AuditLogApplyResult> {
    const { operations, affected, missing } = await this.prepare(entries);
    await chunkedBatch(operations);
    return { affected, missing };
  }
}

export const auditLogProcessorService = new AuditLogProcessorService();
