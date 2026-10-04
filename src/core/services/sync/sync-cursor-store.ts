import { storageService } from '@/core/services/storage';
import type { AuditLogCursors, PendingGrantScopes, SyncCursors } from '@/core/types';
import {
  SYNC_AUDIT_CURSORS_PREFIX,
  SYNC_CURSORS_PREFIX,
  SYNC_GRANT_SCOPES_PREFIX,
} from '@/shared/constants';
import { normalizeCursors } from './sync-cursor';

export class SyncCursorStore {
  constructor(private readonly userScope: () => string) {}

  load(): SyncCursors {
    return normalizeCursors(storageService.getObject<SyncCursors>(this.rowKey()) ?? {});
  }

  save(cursors: SyncCursors): void {
    storageService.setObject(this.rowKey(), cursors);
  }

  loadAudit(): AuditLogCursors {
    return storageService.getObject<AuditLogCursors>(this.auditKey()) ?? {};
  }

  saveAudit(cursors: AuditLogCursors): void {
    storageService.setObject(this.auditKey(), cursors);
  }

  loadGrants(): PendingGrantScopes {
    return storageService.getObject<PendingGrantScopes>(this.grantsKey()) ?? {};
  }

  saveGrants(grants: PendingGrantScopes): void {
    storageService.setObject(this.grantsKey(), grants);
  }

  clear(scope: string = this.userScope()): void {
    storageService.remove(SYNC_CURSORS_PREFIX + scope);
    storageService.remove(SYNC_AUDIT_CURSORS_PREFIX + scope);
    storageService.remove(SYNC_GRANT_SCOPES_PREFIX + scope);
  }

  private rowKey(): string {
    return SYNC_CURSORS_PREFIX + this.userScope();
  }

  private grantsKey(): string {
    return SYNC_GRANT_SCOPES_PREFIX + this.userScope();
  }

  private auditKey(): string {
    return SYNC_AUDIT_CURSORS_PREFIX + this.userScope();
  }
}
