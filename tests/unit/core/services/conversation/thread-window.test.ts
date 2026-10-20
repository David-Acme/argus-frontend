import { describe, expect, test } from 'bun:test';
import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import { buildQueryDescription } from '@nozbe/watermelondb/QueryDescription';
import encodeMatcher from '@nozbe/watermelondb/observation/encodeMatcher';
import {
  INITIAL_THREAD_WINDOW,
  isLiveWindow,
  newerThreadWindow,
  olderThanWindow,
  olderThreadWindow,
  threadWindowClauses,
  type ThreadFetch,
  type ThreadWindow,
} from '@/core/services/conversation';

type Raw = { id: string; created_at: number };
type Row = { id: string; _raw: Raw };

const PAGE = 5;
const MAX_PAGES = 3;

const id = (index: number): string => String(index).padStart(5, '0');

const table = (count: number, sameSecond = false): Row[] =>
  Array.from({ length: count }, (_, index) => {
    const raw = { id: id(index + 1), created_at: sameSecond ? 1000 : 1000 + index };
    return { id: raw.id, _raw: raw };
  });

const compare = (left: Row, right: Row): number =>
  left._raw.created_at - right._raw.created_at || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

const matching = (rows: readonly Row[], where: readonly Clause[]): Row[] =>
  where.reduce<Row[]>((kept, clause) => {
    const matcher = encodeMatcher(buildQueryDescription([clause]));
    return kept.filter((row) => matcher(row._raw as never));
  }, [...rows]);

const fetcher = (rows: readonly Row[], calls: number[] = []): ThreadFetch => async ({ where, order, take }) => {
  calls.push(take);
  const sorted = matching(rows, where).sort(compare);
  return (order === 'desc' ? sorted.reverse() : sorted).slice(0, take);
};

const shown = (rows: readonly Row[], window: ThreadWindow): string[] => {
  const sorted = [...rows].sort(compare);
  if (window.from === null && window.through === null) return sorted.slice(-PAGE).map((row) => row.id);
  return matching(rows, threadWindowClauses(window)).sort(compare).map((row) => row.id);
};

const older = (rows: readonly Row[], window: ThreadWindow) => olderThreadWindow(window, fetcher(rows), PAGE, MAX_PAGES);
const newer = (rows: readonly Row[], window: ThreadWindow) => newerThreadWindow(window, fetcher(rows), PAGE, MAX_PAGES);

describe('a thread is read in pages from the newest line', () => {
  test('it opens on the newest page and nothing else', () => {
    const rows = table(40);
    expect(INITIAL_THREAD_WINDOW).toEqual({ from: null, through: null, pages: 1 });
    expect(shown(rows, INITIAL_THREAD_WINDOW)).toEqual(['00036', '00037', '00038', '00039', '00040']);
  });

  test('scrolling up adds the next older page, held by a created_at plus id cursor', async () => {
    const rows = table(40);
    const calls: number[] = [];
    const next = await olderThreadWindow(INITIAL_THREAD_WINDOW, fetcher(rows, calls), PAGE, MAX_PAGES);
    expect(next).toEqual({ from: null, through: { value: 1030, id: '00031' }, pages: 2 });
    expect(shown(rows, next)).toEqual(rows.slice(30).map((row) => row.id));
    expect(Math.max(...calls)).toBeLessThanOrEqual(PAGE * 2);
  });

  test('past the memory cap the newest page is let go, so the window never grows beyond the cap', async () => {
    const rows = table(40);
    let window = INITIAL_THREAD_WINDOW;
    for (let step = 0; step < 6; step += 1) {
      window = await older(rows, window);
      expect(shown(rows, window).length).toBeLessThanOrEqual(PAGE * MAX_PAGES);
    }
    expect(window.pages).toBe(MAX_PAGES);
    expect(window.from).not.toBeNull();
    expect(shown(rows, window)).toEqual(rows.slice(5, 20).map((row) => row.id));
  });

  test('a window cut off from the newest lines is no longer live; the opening one is', async () => {
    const rows = table(40);
    let window = INITIAL_THREAD_WINDOW;
    for (let step = 0; step < 4; step += 1) window = await older(rows, window);
    expect(isLiveWindow(window)).toBe(false);
    expect(shown(rows, window).includes('00040')).toBe(false);
    expect(isLiveWindow(INITIAL_THREAD_WINDOW)).toBe(true);
  });

  test('the oldest page says there is nothing older', async () => {
    const rows = table(12);
    const first = await older(rows, INITIAL_THREAD_WINDOW);
    const second = await older(rows, first);
    expect(shown(rows, second)).toEqual(rows.map((row) => row.id));
    const probe = olderThanWindow(second);
    expect(probe ? matching(rows, [probe]) : rows).toEqual([]);
    expect(await older(rows, second)).toEqual(second);
  });

  test('scrolling back down walks newer pages and becomes live again at the newest line', async () => {
    const rows = table(40);
    let window = INITIAL_THREAD_WINDOW;
    for (let step = 0; step < 6; step += 1) window = await older(rows, window);
    const seen = new Set<string>(shown(rows, window));
    for (let step = 0; step < 10 && window.from !== null; step += 1) {
      window = await newer(rows, window);
      shown(rows, window).forEach((row) => seen.add(row));
      expect(shown(rows, window).length).toBeLessThanOrEqual(PAGE * MAX_PAGES);
    }
    expect(window.from).toBeNull();
    expect(shown(rows, window).at(-1)).toBe('00040');
    expect(seen.size).toBe(35);
  });

  test('a live window takes a new line at once', async () => {
    const rows = table(40);
    const window = await older(rows, INITIAL_THREAD_WINDOW);
    const grown = [...rows, { id: '00041', _raw: { id: '00041', created_at: 2000 } }];
    expect(shown(grown, window).at(-1)).toBe('00041');
    expect(await newer(grown, window)).toEqual(window);
  });

  test('lines that share a second are paged by id and none is skipped or repeated', async () => {
    const rows = table(23, true);
    let window = INITIAL_THREAD_WINDOW;
    const seen = new Set(shown(rows, window));
    for (let step = 0; step < 10; step += 1) {
      window = await older(rows, window);
      shown(rows, window).forEach((row) => seen.add(row));
    }
    expect(seen.size).toBe(23);
  });
});
