import { describe, expect, test } from 'bun:test';
import {
  advanceRowCursors,
  applyDeletedBaselines,
  buildDeletedBaselineDto,
  buildSyncDto,
  collectPageRows,
  compareIds,
  maxPosition,
  normalizeCursors,
  pendingDeletedBaselines,
  rangeFrom,
  secondsOf,
  withoutCreatedCursor,
} from '@/core/services/sync/sync-cursor';
import { SYNC_PROJECTION_VERSION } from '@/core/services/sync/sync-constants';
import type { SyncCreatedRows, SyncCursors, SyncDeletedRows } from '@/core/types';
import { SYNC_TABLE_KEYS } from '@/core/types';
import { SYNC_PAGE_SIZE } from '@/shared/constants';

describe('secondsOf', () => {
  test('numbers and numeric strings are floored, anything else is zero', () => {
    expect(secondsOf(12.9)).toBe(12);
    expect(secondsOf('40')).toBe(40);
    expect(secondsOf('abc')).toBe(0);
    expect(secondsOf(undefined)).toBe(0);
    expect(secondsOf(Infinity)).toBe(0);
  });
});

describe('compareIds', () => {
  test('a missing id sorts before a present one and two missing ids are equal', () => {
    expect(compareIds(undefined, undefined)).toBe(0);
    expect(compareIds(undefined, 1)).toBe(-1);
    expect(compareIds(1, undefined)).toBe(1);
  });

  test('numeric ids compare by value, even as strings', () => {
    expect(compareIds('10', 9)).toBe(1);
    expect(compareIds(3, 7)).toBe(-4);
  });

  test('non numeric ids compare lexically', () => {
    expect(compareIds('b', 'a')).toBeGreaterThan(0);
    expect(compareIds('a', 'b')).toBeLessThan(0);
  });
});

describe('rangeFrom', () => {
  test('no positive start means no range', () => {
    expect(rangeFrom(undefined, 5)).toBeUndefined();
    expect(rangeFrom(0, 5)).toBeUndefined();
  });

  test('a safe integer id travels with the start time', () => {
    expect(rangeFrom(100, 7)).toEqual({ startTime: 100, startId: 7 });
    expect(rangeFrom(100, '8')).toEqual({ startTime: 100, startId: 8 });
  });

  test('a missing or non integer id leaves only the start time', () => {
    expect(rangeFrom(100)).toEqual({ startTime: 100 });
    expect(rangeFrom(100, 'abc')).toEqual({ startTime: 100 });
    expect(rangeFrom(100, 1.5)).toEqual({ startTime: 100 });
  });
});

describe('withoutCreatedCursor', () => {
  test('keeps the deletion half and stamps the projection version', () => {
    expect(
      withoutCreatedCursor({
        createdStart: 10,
        createdId: 2,
        deletedStart: 20,
        deletedId: 3,
        deletedBaseline: true,
        projection: 1,
      })
    ).toEqual({
      deletedStart: 20,
      deletedId: 3,
      deletedBaseline: true,
      projection: SYNC_PROJECTION_VERSION,
    });
  });

  test('an absent cursor becomes an empty one of the current projection', () => {
    expect(withoutCreatedCursor(undefined)).toEqual({
      deletedStart: undefined,
      deletedId: undefined,
      deletedBaseline: undefined,
      projection: SYNC_PROJECTION_VERSION,
    });
  });
});

describe('normalizeCursors', () => {
  test('a cursor of the current projection is kept as stored', () => {
    const current = { createdStart: 5, projection: SYNC_PROJECTION_VERSION };
    expect(normalizeCursors({ user: current }).user).toBe(current);
  });

  test('an older cursor drops its created half and keeps a known deletion baseline', () => {
    const cursors = normalizeCursors({
      camera: { createdStart: 5, deletedStart: 9, deletedId: 1, projection: 1 },
    });
    expect(cursors.camera).toEqual({
      deletedStart: 9,
      deletedId: 1,
      deletedBaseline: true,
      projection: SYNC_PROJECTION_VERSION,
    });
  });

  test('every table gets a cursor even when nothing was stored', () => {
    const cursors = normalizeCursors({});
    expect(Object.keys(cursors)).toEqual([...SYNC_TABLE_KEYS]);
    expect(cursors.zone?.deletedBaseline).toBeUndefined();
  });
});

describe('maxPosition', () => {
  test('rows without a positive time are ignored', () => {
    expect(maxPosition([{ id: 1, createdAt: 0 }, { id: 2 }], 'createdAt')).toBeNull();
  });

  test('the latest time wins and the highest id breaks a tie', () => {
    const rows = [
      { id: 4, createdAt: 100 },
      { id: 9, createdAt: 200 },
      { id: 12, createdAt: 200 },
      { id: 3, createdAt: 150 },
    ];
    expect(maxPosition(rows, 'createdAt')).toEqual({ time: 200, id: 12 });
  });

  test('reads the requested time field', () => {
    const rows = [{ id: 1, createdAt: 900, deletedAt: 50 }];
    expect(maxPosition(rows, 'deletedAt')).toEqual({ time: 50, id: 1 });
  });
});

describe('buildSyncDto', () => {
  test('asks for creations and, outside notification, deletions from the cursor', () => {
    const cursors: SyncCursors = {
      camera: { createdStart: 10, createdId: 2, deletedStart: 20, deletedId: 3 },
      notification: { createdStart: 30, deletedStart: 40 },
      zone: {},
    };
    expect(buildSyncDto(['camera', 'notification', 'zone'], cursors)).toEqual({
      camera: {
        requiredCreate: true,
        created: { startTime: 10, startId: 2 },
        requiredDeleted: true,
        deleted: { startTime: 20, startId: 3 },
      },
      notification: { requiredCreate: true, created: { startTime: 30 } },
      zone: { requiredCreate: true, requiredDeleted: true },
    });
  });
});

describe('deleted baselines', () => {
  test('tables with deletions and no baseline are pending, notification never is', () => {
    const cursors: SyncCursors = { user: { deletedBaseline: true } };
    const pending = pendingDeletedBaselines(cursors);
    expect(pending).not.toContain('user');
    expect(pending).not.toContain('notification');
    expect(pending).toContain('camera');
  });

  test('the request asks each pending table for its last deletion', () => {
    expect(buildDeletedBaselineDto(['camera', 'zone'])).toEqual({
      camera: { findLastDeleted: true },
      zone: { findLastDeleted: true },
    });
  });

  test('a response marks the baseline and seeds an empty deletion start only', () => {
    const cursors: SyncCursors = { camera: {}, zone: { deletedStart: 5, deletedId: 1 }, event: {} };
    applyDeletedBaselines(
      ['camera', 'zone', 'event', 'person'],
      {
        camera: { created: [], deleted: [], lastSyncDate: { deleted: 77, deletedId: 4 } },
        zone: { created: [], deleted: [], lastSyncDate: { deleted: 99, deletedId: 8 } },
        event: { created: [], deleted: [], lastSyncDate: { deleted: 0 } },
      },
      cursors
    );
    expect(cursors.camera).toEqual({ deletedBaseline: true, deletedStart: 77, deletedId: 4 });
    expect(cursors.zone).toEqual({ deletedBaseline: true, deletedStart: 5, deletedId: 1 });
    expect(cursors.event).toEqual({ deletedBaseline: true });
    expect(cursors.person).toBeUndefined();
  });
});

describe('page rows and cursor advance', () => {
  test('only tables present in the response are collected, non arrays become empty', () => {
    const { created, deleted } = collectPageRows(['camera', 'zone', 'event'], {
      camera: { created: [{ id: 1 }], deleted: [{ id: 2, deletedAt: 3 }] },
      zone: { created: null as never, deleted: null as never },
    });
    expect([...created.keys()]).toEqual(['camera', 'zone']);
    expect(created.get('zone')).toEqual([]);
    expect(deleted.get('zone')).toEqual([]);
    expect(deleted.get('camera')).toEqual([{ id: 2, deletedAt: 3 }]);
  });

  test('cursors move to the latest rows and a full page asks for more', () => {
    const full = Array.from({ length: SYNC_PAGE_SIZE }, (_, index) => ({
      id: index + 1,
      createdAt: 1000 + index,
    }));
    const created: SyncCreatedRows = new Map([
      ['camera', full],
      ['zone', [{ id: 5, createdAt: 50 }]],
      ['event', []],
    ]);
    const deleted: SyncDeletedRows = new Map([
      ['camera', []],
      ['zone', [{ id: 6, deletedAt: 60 }]],
      ['event', []],
    ]);
    const cursors: SyncCursors = { event: { createdStart: 1, deletedBaseline: true } };
    const more = advanceRowCursors(created, deleted, cursors);
    expect(more).toEqual(['camera']);
    expect(cursors.camera).toEqual({
      createdStart: 1000 + SYNC_PAGE_SIZE - 1,
      createdId: SYNC_PAGE_SIZE,
    });
    expect(cursors.zone).toEqual({
      createdStart: 50,
      createdId: 5,
      deletedStart: 60,
      deletedId: 6,
    });
    expect(cursors.event).toEqual({ createdStart: 1, deletedBaseline: true });
  });
});
