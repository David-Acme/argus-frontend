import { describe, expect, test } from 'bun:test';
import type { IAuditLogEntry, IAuditLogChange } from '@/core/interfaces';
import { planAuditEntries, toAuditRemoval } from '@/core/services/sync/audit-log-patch';

const entry = (
  id: number,
  tableName: string,
  recordId: number,
  changes: Record<string, IAuditLogChange>
): IAuditLogEntry => ({ id, tableName, recordId, changes });

const deleted = (id: number, recordId: number, at = 1_790_000_100): IAuditLogEntry =>
  entry(id, 'notification', recordId, { deletedAt: { previous: null, current: at } });

const read = (id: number, recordId: number): IAuditLogEntry =>
  entry(id, 'notification', recordId, {
    isRead: { previous: false, current: true },
    readAt: { previous: null, current: 1_790_000_050 },
  });

describe('a notification diff that sets deletedAt', () => {
  test('is a removal of that row', () => {
    expect(toAuditRemoval(deleted(1, 5))).toEqual({ key: 'notification', recordId: '5' });
  });

  test('is still a removal when compaction merged it with other fields', () => {
    const merged = entry(2, 'notification', 5, {
      isRead: { previous: false, current: true },
      deletedAt: { previous: null, current: 1_790_000_100 },
    });
    expect(toAuditRemoval(merged)).toEqual({ key: 'notification', recordId: '5' });
  });

  test('is no removal when deletedAt stays or goes back to null', () => {
    expect(toAuditRemoval(entry(3, 'notification', 5, { deletedAt: { previous: 1, current: null } }))).toBeNull();
    expect(toAuditRemoval(entry(4, 'notification', 5, { deletedAt: { previous: null } }))).toBeNull();
    expect(toAuditRemoval(read(5, 5))).toBeNull();
  });

  test('of a table whose deletions travel as Delete frames and pulls is never a removal', () => {
    expect(toAuditRemoval(entry(6, 'reminder', 5, { deletedAt: { previous: null, current: 1 } }))).toBeNull();
    expect(toAuditRemoval(entry(7, 'audit_log', 5, { deletedAt: { previous: null, current: 1 } }))).toBeNull();
  });
});

describe('planAuditEntries', () => {
  test('a removal drops the earlier patches of its row and outranks a later one', () => {
    const plan = planAuditEntries([read(3, 5), deleted(4, 5), read(5, 5), read(2, 6)]);
    expect([...(plan.removals.get('notification') ?? [])]).toEqual(['5']);
    expect([...(plan.patches.get('notification')?.keys() ?? [])]).toEqual(['6']);
  });

  test('the order is the audit id, not the order the entries arrived in', () => {
    const plan = planAuditEntries([deleted(9, 5), read(8, 5)]);
    expect([...(plan.removals.get('notification') ?? [])]).toEqual(['5']);
    expect(plan.patches.get('notification')?.size ?? 0).toBe(0);
  });

  test('patches of one row still merge in id order, the later value winning', () => {
    const plan = planAuditEntries([
      entry(12, 'notification', 7, { isRead: { previous: true, current: false } }),
      entry(11, 'notification', 7, { isRead: { previous: false, current: true } }),
    ]);
    expect(plan.patches.get('notification')?.get('7')?.props).toEqual({ isRead: false });
    expect(plan.removals.size).toBe(0);
  });

  test('a diff of fields this build does not map is neither a patch nor a removal', () => {
    const plan = planAuditEntries([entry(1, 'notification', 7, { unknownField: { previous: 1, current: 2 } })]);
    expect(plan.patches.size).toBe(0);
    expect(plan.removals.size).toBe(0);
  });
});
