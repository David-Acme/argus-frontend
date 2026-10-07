import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { buildQueryDescription } from '@nozbe/watermelondb/QueryDescription';
import encodeMatcher from '@nozbe/watermelondb/observation/encodeMatcher';
import { Subscription } from 'rxjs';
import type { IServiceResponse } from '@/core/interfaces';
import type { KeysetCursor, KeysetSort, RemotePage } from '@/core/types';

const memory = new Map<string, string>();

mock.module('@/core/services/storage', () => ({
  storageService: {
    set: (key: string, value: string) => memory.set(key, String(value)),
    getString: (key: string) => memory.get(key) ?? null,
    getObject: (key: string) => (memory.has(key) ? JSON.parse(memory.get(key) as string) : null),
    remove: (key: string) => memory.delete(key),
    getAllKeys: () => [...memory.keys()],
  },
}));

const { cursorOf, keysetAfter, keysetThrough, mergeHead, mergeTail, RemoteFeed } =
  await import('@/core/services/paging');
const { PagedView } = await import('@/core/services/view-cache/paged-view');
const { viewCacheService } = await import('@/core/services/view-cache.service');
const { infiniteFooter } = await import('@/shared/libs/infinite-list');

type Row = { id: string; created_at: number };

const matches = (clause: Clause) => {
  const matcher = encodeMatcher(buildQueryDescription([clause]));
  return (row: Row) => matcher(row);
};

const ordered = (rows: readonly Row[], sort: KeysetSort): Row[] =>
  [...rows].sort((left, right) => {
    const byValue =
      left.created_at - right.created_at || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    return sort.order === 'desc' ? -byValue : byValue;
  });

const cursorFor = (row: Row): KeysetCursor => ({ value: row.created_at, id: row.id });

const window = (rows: readonly Row[], sort: KeysetSort, through: KeysetCursor) =>
  ordered(rows.filter(matches(keysetThrough(sort, through))), sort);

const beyond = (rows: readonly Row[], sort: KeysetSort, through: KeysetCursor) =>
  ordered(rows.filter(matches(keysetAfter(sort, through))), sort);

const table: Row[] = [
  { id: '1', created_at: 100 },
  { id: '2', created_at: 100 },
  { id: '3', created_at: 90 },
  { id: '4', created_at: 90 },
  { id: '5', created_at: 90 },
  { id: '6', created_at: 80 },
  { id: '7', created_at: 70 },
  { id: '8', created_at: 70 },
];

describe('keyset clauses', () => {
  for (const order of ['desc', 'asc'] as const) {
    const sort: KeysetSort = { column: 'created_at', order };

    test(`${order}: every row is either inside the window or beyond it, never both`, () => {
      for (const pivot of table) {
        const inside = window(table, sort, cursorFor(pivot)).map((row) => row.id);
        const after = beyond(table, sort, cursorFor(pivot)).map((row) => row.id);
        expect(inside.filter((id) => after.includes(id))).toEqual([]);
        expect([...inside, ...after].sort()).toEqual(table.map((row) => row.id).sort());
        expect(inside[inside.length - 1]).toBe(pivot.id);
      }
    });

    test(`${order}: the window is the ordered prefix up to the cursor, ties broken by id`, () => {
      const sequence = ordered(table, sort);
      sequence.forEach((pivot, index) => {
        expect(window(table, sort, cursorFor(pivot))).toEqual(sequence.slice(0, index + 1));
      });
    });
  }

  test('paging page by page visits every row once, even across equal timestamps', () => {
    const sort: KeysetSort = { column: 'created_at', order: 'desc' };
    const pageSize = 3;
    const seen: string[] = [];
    let through: KeysetCursor | null = null;
    for (let step = 0; step < 10; step += 1) {
      const next: Row[] = through
        ? beyond(table, sort, through).slice(0, pageSize)
        : ordered(table, sort).slice(0, pageSize);
      const last = next[next.length - 1];
      if (!last) break;
      seen.push(...next.map((row) => row.id));
      through = cursorFor(last);
    }
    expect(seen).toEqual(ordered(table, sort).map((row) => row.id));
  });

  test('rows synced in while the window is open join it and nothing visible drops out', () => {
    const sort: KeysetSort = { column: 'created_at', order: 'desc' };
    const through = cursorFor(table[4] as Row);
    const before = window(table, sort, through).map((row) => row.id);
    const grown = [
      ...table,
      { id: '9', created_at: 200 },
      { id: '10', created_at: 90 },
      { id: '11', created_at: 10 },
    ];
    const after = window(grown, sort, through).map((row) => row.id);
    expect(after.filter((id) => before.includes(id))).toEqual(before);
    expect(after).toContain('9');
    expect(after).not.toContain('11');
    expect(new Set(after).size).toBe(after.length);
    expect(beyond(grown, sort, through).map((row) => row.id)).toContain('11');
  });

  test('the cursor reads the raw column and the id', () => {
    const sort: KeysetSort = { column: 'created_at', order: 'desc' };
    expect(cursorOf({ id: '4', _raw: { created_at: 90 } }, sort)).toEqual({ value: 90, id: '4' });
    expect(cursorOf({ id: '4', _raw: { created_at: null } }, sort)).toBeNull();
  });
});

type Episode = { key: string; at: number };

const order = {
  keyOf: (row: Episode) => row.key,
  compare: (left: Episode, right: Episode) =>
    right.at - left.at || left.key.localeCompare(right.key),
};

const episode = (key: string, at: number): Episode => ({ key, at });

describe('remote page merging', () => {
  test('a first answer replaces nothing when there was nothing', () => {
    expect(mergeHead(null, { rows: [episode('a', 5)], next: 5 }, order)).toEqual({
      rows: [episode('a', 5)],
      next: 5,
    });
  });

  test('refreshing the head keeps the pages already scrolled and their cursor', () => {
    const previous = {
      rows: [episode('a', 9), episode('b', 8), episode('c', 7), episode('d', 6)],
      next: 6,
    };
    const merged = mergeHead(
      previous,
      { rows: [episode('z', 10), episode('a', 9)], next: 9 },
      order
    );
    expect(merged.rows.map((row) => row.key)).toEqual(['z', 'a', 'b', 'c', 'd']);
    expect(merged.next).toBe(6);
  });

  test('a head that says nothing more drops the stale tail', () => {
    const previous = { rows: [episode('a', 9), episode('b', 8), episode('c', 7)], next: 7 };
    const merged = mergeHead(previous, { rows: [episode('a', 9)], next: null }, order);
    expect(merged).toEqual({ rows: [episode('a', 9)], next: null });
  });

  test('a moved row appears once, in its new place', () => {
    const previous = { rows: [episode('a', 9), episode('b', 8), episode('c', 7)], next: 7 };
    const merged = mergeHead(
      previous,
      { rows: [episode('c', 11), episode('a', 9)], next: 9 },
      order
    );
    expect(merged.rows.map((row) => row.key)).toEqual(['c', 'a', 'b']);
  });

  test('an overlapping next page appends only the new rows', () => {
    const previous = { rows: [episode('a', 9), episode('b', 8)], next: 8 };
    const merged = mergeTail(
      previous,
      { rows: [episode('b', 8), episode('c', 8), episode('d', 3)], next: 3 },
      order
    );
    expect(merged.rows.map((row) => row.key)).toEqual(['a', 'b', 'c', 'd']);
    expect(merged.next).toBe(3);
  });

  test('a page that brings nothing new ends the feed instead of looping', () => {
    const previous = { rows: [episode('a', 9), episode('b', 8)], next: 8 };
    expect(mergeTail(previous, { rows: [episode('b', 8)], next: 8 }, order).next).toBeNull();
  });
});

describe('RemoteFeed', () => {
  beforeEach(() => {
    memory.clear();
    viewCacheService.setUserId('u1');
  });

  const ok = (
    page: RemotePage<Episode, number>
  ): IServiceResponse<RemotePage<Episode, number>> => ({
    status: 200,
    ok: true,
    info: page,
    errors: null,
  });

  test('loads the head, then the next page once even when asked twice', async () => {
    const calls: (number | null)[] = [];
    const feed = new RemoteFeed<Episode, number>({
      key: 'guard.episode-feed',
      ...order,
      fetch: async (_scope, cursor) => {
        calls.push(cursor);
        return cursor === null
          ? ok({ rows: [episode('a', 9), episode('b', 8)], next: 8 })
          : ok({ rows: [episode('c', 7)], next: null });
      },
    });
    expect(await feed.refresh('all')).toBe(true);
    const [first, second] = await Promise.all([feed.loadMore('all'), feed.loadMore('all')]);
    expect(first && second).toBe(true);
    expect(calls).toEqual([null, 8]);
    expect(feed.snapshot('all')).toEqual({
      rows: [episode('a', 9), episode('b', 8), episode('c', 7)],
      next: null,
    });
    expect(await feed.loadMore('all')).toBe(true);
    expect(calls).toHaveLength(2);
  });

  test('a failed page keeps what is shown and reports the failure', async () => {
    let fail = false;
    const feed = new RemoteFeed<Episode, number>({
      key: 'guard.episode-feed',
      ...order,
      fetch: async () =>
        fail
          ? { status: 503, ok: false, info: null, errors: null }
          : ok({ rows: [episode('a', 9)], next: 9 }),
    });
    await feed.refresh('all');
    fail = true;
    expect(await feed.loadMore('all')).toBe(false);
    expect(feed.snapshot('all')).toEqual({ rows: [episode('a', 9)], next: 9 });
  });

  test('an optimistic edit keeps the cursor and scopes stay apart', async () => {
    const feed = new RemoteFeed<Episode, number>({
      key: 'guard.episode-feed',
      ...order,
      fetch: async (scope) => ok({ rows: [episode(scope, 9)], next: 9 }),
    });
    await feed.refresh('all');
    await feed.refresh('2');
    feed.mutate('all', (rows) => rows.map((row) => ({ ...row, at: 1 })));
    expect(feed.snapshot('all')).toEqual({ rows: [episode('all', 1)], next: 9 });
    expect(feed.snapshot('2')).toEqual({ rows: [episode('2', 9)], next: 9 });
  });
});

describe('PagedView', () => {
  beforeEach(() => {
    memory.clear();
    viewCacheService.setUserId('u1');
  });

  const spec = (opened: { scope: string; size: number }[], closed: string[]) => ({
    key: 'notification.feed' as const,
    warm: ['all'],
    initial: () => ({ size: 1 }),
    open: (scope: string, window: { size: number }) => {
      opened.push({ scope, size: window.size });
      return new Subscription(() => closed.push(`${scope}:${window.size}`));
    },
    extend: async (_scope: string, window: { size: number }) => ({ size: window.size + 1 }),
    same: (left: { size: number }, right: { size: number }) => left.size === right.size,
  });

  test('a warm scope opens at once, grows while watched and shrinks back when left', async () => {
    const opened: { scope: string; size: number }[] = [];
    const closed: string[] = [];
    const view = new PagedView(spec(opened, closed), { userId: '1', now: new Date() });
    expect(opened).toEqual([{ scope: 'all', size: 1 }]);
    view.watch('all');
    const [first, second] = await Promise.all([view.extend('all'), view.extend('all')]);
    expect(first && second).toBe(true);
    expect(opened.at(-1)).toEqual({ scope: 'all', size: 2 });
    expect(opened).toHaveLength(2);
    view.release('all');
    expect(opened.at(-1)).toEqual({ scope: 'all', size: 1 });
    expect(closed).toEqual(['all:1', 'all:2']);
    view.stop();
    expect(closed).toHaveLength(3);
  });

  test('a cold scope closes when its last watcher leaves', () => {
    const opened: { scope: string; size: number }[] = [];
    const closed: string[] = [];
    const view = new PagedView(spec(opened, closed), { userId: '1', now: new Date() });
    view.watch('day');
    view.watch('day');
    view.release('day');
    expect(closed).toEqual([]);
    view.release('day');
    expect(closed).toEqual(['day:1']);
  });

  test('extending a scope nobody opened answers false', async () => {
    const view = new PagedView(spec([], []), { userId: '1', now: new Date() });
    expect(await view.extend('nowhere')).toBe(false);
  });
});

describe('infinite list footer', () => {
  test('loading while more may exist, retry after a failure, the end only when exhausted', () => {
    expect(infiniteFooter({ count: 40, hasMore: true, failed: false, endAfter: 20 })).toBe(
      'loading'
    );
    expect(infiniteFooter({ count: 40, hasMore: true, failed: true, endAfter: 20 })).toBe('error');
    expect(infiniteFooter({ count: 40, hasMore: false, failed: false, endAfter: 20 })).toBe('end');
    expect(infiniteFooter({ count: 40, hasMore: false, failed: true, endAfter: 20 })).toBe('end');
    expect(infiniteFooter({ count: 3, hasMore: false, failed: false, endAfter: 20 })).toBe('none');
  });
});
