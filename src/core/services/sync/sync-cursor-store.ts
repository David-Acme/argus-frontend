import { storageService } from '@/core/services/storage';
import type { AuditLogCursors, PendingGrantScopes, SyncCursors } from '@/core/types';
import {
  SYNC_AUDIT_CURSORS_PREFIX,
  SYNC_CURSORS_PREFIX,
  SYNC_GRANT_SCOPES_PREFIX,
} from '@/shared/constants';
import { normalizeCursors } from './sync-cursor';

export type DatabaseFlush = () => Promise<void>;

export class SyncCursorStore {
  private readonly held = new Map<string, string>();

  constructor(
    private readonly userScope: () => string,
    private readonly flush: DatabaseFlush
  ) {}

  load(): SyncCursors {
    return normalizeCursors(this.read<SyncCursors>(this.rowKey()) ?? {});
  }

  save(cursors: SyncCursors): void {
    this.write(this.rowKey(), cursors);
  }

  loadAudit(): AuditLogCursors {
    return this.read<AuditLogCursors>(this.auditKey()) ?? {};
  }

  saveAudit(cursors: AuditLogCursors): void {
    this.write(this.auditKey(), cursors);
  }

  loadGrants(): PendingGrantScopes {
    return this.read<PendingGrantScopes>(this.grantsKey()) ?? {};
  }

  saveGrants(grants: PendingGrantScopes): void {
    this.write(this.grantsKey(), grants);
  }

  clear(scope: string = this.userScope()): void {
    for (const key of [
      SYNC_CURSORS_PREFIX + scope,
      SYNC_AUDIT_CURSORS_PREFIX + scope,
      SYNC_GRANT_SCOPES_PREFIX + scope,
    ]) {
      this.held.delete(key);
      storageService.remove(key);
    }
  }

  private read<T>(key: string): T | null {
    const text = this.held.get(key);
    return text === undefined ? storageService.getObject<T>(key) : (JSON.parse(text) as T);
  }

  private write(key: string, value: unknown): void {
    const text = JSON.stringify(value);
    this.held.set(key, text);
    this.flush().then(
      () => {
        if (this.held.get(key) !== text) return;
        this.held.delete(key);
        storageService.set(key, text);
      },
      () => undefined
    );
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
