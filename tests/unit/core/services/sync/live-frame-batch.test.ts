import { describe, expect, test } from 'bun:test';
import {
  emptyLiveAuditHigh,
  freshLiveAuditEntries,
  groupLiveEvents,
  syncTableKeyOf,
} from '@/core/services/sync/live-frame-batch';
import type { IAuditLogEntry, ISocketEmitDto } from '@/core/interfaces';
import { SYNC_OPERATION } from '@/shared/constants';

const entry = (id: number): IAuditLogEntry => ({
  id,
  recordId: 1,
  tableName: 'camera',
  changes: {},
});

describe('syncTableKeyOf', () => {
  test('only synchronized tables are recognised', () => {
    expect(syncTableKeyOf('camera')).toBe('camera');
    expect(syncTableKeyOf('audit_log')).toBeNull();
  });
});

describe('groupLiveEvents', () => {
  test('splits additions, deletions and both audit scopes and drops unknown tables', () => {
    const events: ISocketEmitDto[] = [
      { operation: SYNC_OPERATION.Add, option: 'camera', info: { id: 1 } },
      { operation: SYNC_OPERATION.Add, option: 'camera', info: { id: 2 } },
      { operation: SYNC_OPERATION.Delete, option: 'zone', info: { id: 3, deletedAt: 9 } },
      { operation: SYNC_OPERATION.Log, option: 'user_audit_log', info: entry(10) },
      { operation: SYNC_OPERATION.Log, option: 'audit_log', info: entry(11) },
      { operation: SYNC_OPERATION.Add, option: 'unknown', info: { id: 4 } },
    ];
    const { created, deleted, logs } = groupLiveEvents(events);
    expect(created.get('camera')).toEqual([{ id: 1 }, { id: 2 }]);
    expect(deleted.get('zone')).toEqual([{ id: 3, deletedAt: 9 }]);
    expect([...created.keys()]).toEqual(['camera']);
    expect(logs.user.map((log) => log.id)).toEqual([10]);
    expect(logs.global.map((log) => log.id)).toEqual([11]);
  });
});

describe('freshLiveAuditEntries', () => {
  test('keeps entries above the cursor and the live high mark, in id order, once each', () => {
    const result = freshLiveAuditEntries(
      { global: [entry(7), entry(3), entry(5), entry(7)], user: [entry(2), entry(4)] },
      { global: { lastId: 3, watermarkId: 3 } },
      { global: 0, user: 2 }
    );
    expect(result.entries.map((log) => log.id)).toEqual([5, 7, 4]);
    expect(result.high).toEqual({ global: 7, user: 4 });
  });

  test('the high mark never falls below the saved cursor', () => {
    const result = freshLiveAuditEntries(
      { global: [], user: [] },
      { user: { lastId: 12, watermarkId: 20 } },
      emptyLiveAuditHigh()
    );
    expect(result.entries).toEqual([]);
    expect(result.high).toEqual({ global: 0, user: 12 });
  });

  test('entries with a non numeric id are skipped', () => {
    const result = freshLiveAuditEntries(
      { global: [{ ...entry(1), id: Number.NaN }], user: [] },
      {},
      emptyLiveAuditHigh()
    );
    expect(result.entries).toEqual([]);
  });

  test('does not mutate the previous high mark', () => {
    const high = emptyLiveAuditHigh();
    freshLiveAuditEntries({ global: [entry(9)], user: [] }, {}, high);
    expect(high).toEqual({ global: 0, user: 0 });
  });
});
