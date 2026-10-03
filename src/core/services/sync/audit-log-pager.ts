import type { IAuditLogEntry, IAuditLogSyncResponse } from '@/core/interfaces';
import type { AuditLogCursor, AuditLogRequest, AuditLogScope } from '@/core/types';
import { buildAuditRequest } from './audit-log-cursor';
import { auditLogProcessorService } from './audit-log-processor.service';
import type { ProjectionEpoch } from './projection-epoch';
import { SYNC_AUDIT_SCOPES, SYNC_STATUS_REPLICA_TOO_OLD } from './sync-constants';
import type { SyncCursorStore } from './sync-cursor-store';
import { isSyncRequestError } from './sync-request-error';

export type AuditLogPagerDeps = {
  request: (scope: AuditLogScope, payload: AuditLogRequest) => Promise<IAuditLogSyncResponse>;
  cursors: SyncCursorStore;
  epoch: ProjectionEpoch;
  onEntries: (entries: IAuditLogEntry[]) => void;
  onMissing: () => void;
};

export class AuditLogPager {
  constructor(private readonly deps: AuditLogPagerDeps) {}

  async ensureBaselines(epoch: number): Promise<void> {
    for (const scope of SYNC_AUDIT_SCOPES) {
      if (this.deps.cursors.loadAudit()[scope]) continue;
      await this.resetBaseline(scope, epoch);
    }
  }

  async resetBaseline(scope: AuditLogScope, epoch: number): Promise<void> {
    const watermarkId = await this.fetchWatermark(scope);
    this.deps.epoch.assert(epoch);
    const cursors = this.deps.cursors.loadAudit();
    cursors[scope] = { lastId: watermarkId, watermarkId };
    this.deps.cursors.saveAudit(cursors);
  }

  async syncAll(epoch: number): Promise<AuditLogScope[]> {
    const stale: AuditLogScope[] = [];
    for (const scope of SYNC_AUDIT_SCOPES) {
      if (await this.syncScope(scope, epoch)) stale.push(scope);
    }
    return stale;
  }

  private async fetchWatermark(scope: AuditLogScope): Promise<number> {
    const response = await this.deps.request(scope, { findLast: true });
    const watermarkId = Number(response.watermarkId ?? 0);
    return Number.isFinite(watermarkId) && watermarkId > 0 ? watermarkId : 0;
  }

  private async syncScope(scope: AuditLogScope, epoch: number): Promise<boolean> {
    const watermarkId = await this.fetchWatermark(scope);
    this.deps.epoch.assert(epoch);
    const saved = this.deps.cursors.loadAudit()[scope] ?? { lastId: 0, watermarkId: 0 };
    if (watermarkId < saved.lastId) return true;
    let cursor: AuditLogCursor = { ...saved, watermarkId };

    while (cursor.lastId < cursor.watermarkId) {
      let response: IAuditLogSyncResponse;
      try {
        response = await this.deps.request(scope, buildAuditRequest(cursor));
      } catch (error) {
        if (isSyncRequestError(error, SYNC_STATUS_REPLICA_TOO_OLD)) return true;
        throw error;
      }
      this.deps.epoch.assert(epoch);
      const entries = Array.isArray(response.info) ? response.info : [];
      if (entries.length === 0) break;
      const result = await auditLogProcessorService.apply(entries);
      this.deps.onEntries(entries);
      if (result.missing.length > 0) this.deps.onMissing();

      const nextId = Number(response.nextCursorId ?? entries.at(-1)?.id);
      if (!Number.isFinite(nextId) || nextId <= cursor.lastId) {
        throw new Error('Audit synchronization did not advance its cursor');
      }
      cursor = { ...cursor, lastId: Math.min(nextId, cursor.watermarkId) };
      const cursors = this.deps.cursors.loadAudit();
      cursors[scope] = cursor;
      this.deps.cursors.saveAudit(cursors);
    }
    return false;
  }
}
