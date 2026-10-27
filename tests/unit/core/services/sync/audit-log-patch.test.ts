import { describe, expect, test } from 'bun:test';
import type { IAuditLogEntry, IAuditLogChange } from '@/core/interfaces';
import {
  patchedProps,
  planAuditEntries,
  toAuditPatch,
  toAuditRemoval,
} from '@/core/services/sync/audit-log-patch';

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
    expect(toAuditRemoval(entry(6, 'camera', 5, { deletedAt: { previous: null, current: 1 } }))).toBeNull();
    expect(toAuditRemoval(entry(7, 'audit_log', 5, { deletedAt: { previous: null, current: 1 } }))).toBeNull();
  });
});

describe('an old reminder diff', () => {
  test('patches nothing and removes nothing, because reminders left the sync', () => {
    const title = entry(8, 'reminder', 5, { title: { previous: 'Regar', current: 'Regar las plantas' } });
    const removed = entry(9, 'reminder', 5, { deletedAt: { previous: null, current: 1 } });
    expect(toAuditPatch(title)).toBeNull();
    expect(toAuditRemoval(removed)).toBeNull();
    expect(planAuditEntries([title, removed]).patches.size).toBe(0);
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

describe('a missed reminder call that rewrites its feed row in place', () => {
  const rowData = { kind: 'agenda', threadKey: 'agenda:reminder:7:1790000000', reminderId: 7, scheduledAt: 1_790_000_000 };

  const missed = (id: number) =>
    entry(id, 'notification', 41, {
      type: { previous: 'agenda', current: 'call_missed' },
      title: { previous: 'Argus · Regar las plantas', current: 'Llamada perdida · Recordatorio' },
      body: { previous: 'Regar las plantas', current: 'Te llamé para recordarte: Regar las plantas.' },
      isRead: { previous: true, current: false },
      readAt: { previous: 1_790_000_050, current: null },
      'data.kind': { previous: 'agenda', current: 'call' },
      'data.callId': { previous: null, current: 'c-9' },
      'data.summary': { previous: null, current: 'Regar las plantas' },
    });

  test('patches the type, title, body and read state, and keeps the data paths apart', () => {
    const patch = toAuditPatch(missed(20));
    expect(patch?.props).toEqual({
      type: 'call_missed',
      title: 'Llamada perdida · Recordatorio',
      body: 'Te llamé para recordarte: Regar las plantas.',
      isRead: false,
      readAt: null,
    });
    expect(patch?.paths).toEqual([
      { prop: 'data', path: ['kind'], value: 'call' },
      { prop: 'data', path: ['callId'], value: 'c-9' },
      { prop: 'data', path: ['summary'], value: 'Regar las plantas' },
    ]);
  });

  test('merges the data paths over the row it updates, so the reminder it names stays', () => {
    const patch = planAuditEntries([missed(20)]).patches.get('notification')?.get('41');
    if (!patch) throw new Error('no patch');
    const props = patchedProps(patch, (prop) => (prop === 'data' ? rowData : undefined));
    expect(props.data).toEqual({ ...rowData, kind: 'call', callId: 'c-9', summary: 'Regar las plantas' });
    expect(props.title).toBe('Llamada perdida · Recordatorio');
    expect(rowData.kind).toBe('agenda');
  });

  test('a key the diff clears leaves the data, and a later diff of the whole data wins', () => {
    const cleared = entry(21, 'notification', 41, { 'data.scheduledAt': { previous: 1_790_000_000, current: null } });
    const whole = entry(22, 'notification', 41, { data: { previous: rowData, current: { kind: 'call' } } });
    const onlyCleared = planAuditEntries([cleared]).patches.get('notification')?.get('41');
    if (!onlyCleared) throw new Error('no patch');
    expect(patchedProps(onlyCleared, () => rowData).data).not.toHaveProperty('scheduledAt');
    const merged = planAuditEntries([cleared, whole]).patches.get('notification')?.get('41');
    if (!merged) throw new Error('no patch');
    expect(merged.paths).toEqual([]);
    expect(patchedProps(merged, () => rowData).data).toEqual({ kind: 'call' });
  });

  test('a dotted path into a column that is not JSON is ignored', () => {
    expect(toAuditPatch(entry(23, 'notification', 41, { 'title.x': { previous: 'a', current: 'b' } }))?.paths).toEqual([]);
  });
});
