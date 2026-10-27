import { beforeEach, describe, expect, mock, test } from 'bun:test';

const memory = new Map<string, string>();

mock.module('@/core/services/storage', () => ({
  storageService: {
    set: (key: string, value: string) => memory.set(key, String(value)),
    getObject: (key: string) => (memory.has(key) ? JSON.parse(memory.get(key) as string) : null),
    remove: (key: string) => memory.delete(key),
  },
}));

const { SyncCursorStore } = await import('@/core/services/sync/sync-cursor-store');
const { SYNC_PROJECTION_VERSION } = await import('@/core/services/sync/sync-constants');
const { SYNC_AUDIT_CURSORS_PREFIX, SYNC_CURSORS_PREFIX, SYNC_GRANT_SCOPES_PREFIX } =
  await import('@/shared/constants');

type Gate = { flush: () => Promise<void>; settle: (ok: boolean) => Promise<void> };

function gate(): Gate {
  const waiting: { resolve: () => void; reject: (error: Error) => void }[] = [];
  return {
    flush: () => new Promise<void>((resolve, reject) => waiting.push({ resolve, reject })),
    settle: async (ok) => {
      for (const next of waiting.splice(0)) {
        if (ok) next.resolve();
        else next.reject(new Error('not saved'));
      }
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

const ROWS = `${SYNC_CURSORS_PREFIX}u1`;

describe('SyncCursorStore', () => {
  beforeEach(() => memory.clear());

  test('a cursor reaches storage only after the database is saved, and reads back at once', async () => {
    const database = gate();
    const store = new SyncCursorStore(() => 'u1', database.flush);
    const project = { createdStart: 10, createdId: 3, projection: SYNC_PROJECTION_VERSION };
    store.save({ project });
    expect(memory.has(ROWS)).toBe(false);
    expect(store.load().project?.createdStart).toBe(10);
    await database.settle(true);
    expect(JSON.parse(memory.get(ROWS) ?? '{}')).toEqual({ project });
  });

  test('a database that fails to save keeps the stored cursor where it was', async () => {
    const database = gate();
    const audit = `${SYNC_AUDIT_CURSORS_PREFIX}u1`;
    memory.set(audit, JSON.stringify({ global: { lastId: 4, watermarkId: 9 } }));
    const store = new SyncCursorStore(() => 'u1', database.flush);
    store.saveAudit({ global: { lastId: 8, watermarkId: 9 } });
    await database.settle(false);
    expect(JSON.parse(memory.get(audit) ?? '{}')).toEqual({
      global: { lastId: 4, watermarkId: 9 },
    });
    expect(store.loadAudit().global?.lastId).toBe(8);
  });

  test('only the newest of two saves is written, and a read returns a copy', async () => {
    const database = gate();
    const store = new SyncCursorStore(() => 'u1', database.flush);
    store.saveAudit({ global: { lastId: 1, watermarkId: 9 } });
    store.saveAudit({ global: { lastId: 5, watermarkId: 9 } });
    const read = store.loadAudit();
    if (read.global) read.global.lastId = 99;
    expect(store.loadAudit().global?.lastId).toBe(5);
    await database.settle(true);
    expect(JSON.parse(memory.get(`${SYNC_AUDIT_CURSORS_PREFIX}u1`) ?? '{}')).toEqual({
      global: { lastId: 5, watermarkId: 9 },
    });
  });

  test('a clear drops a cursor still waiting for the database', async () => {
    const database = gate();
    const store = new SyncCursorStore(() => 'u1', database.flush);
    store.saveGrants({ project: ['900'] });
    store.clear();
    expect(store.loadGrants()).toEqual({});
    await database.settle(true);
    expect(memory.has(`${SYNC_GRANT_SCOPES_PREFIX}u1`)).toBe(false);
  });
});
