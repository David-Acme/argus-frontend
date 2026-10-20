import type { Clause } from '@nozbe/watermelondb/QueryDescription';
import type { KeysetCursor, KeysetSort } from '@/core/types';
import { cursorOf, keysetAfter, keysetThrough, type KeysetRaw } from '../paging/keyset';

export type ThreadWindow = {
  from: KeysetCursor | null;
  through: KeysetCursor | null;
  pages: number;
};

export type ThreadFetchQuery = {
  where: Clause[];
  order: 'asc' | 'desc';
  take: number;
};

export type ThreadFetch = (query: ThreadFetchQuery) => Promise<KeysetRaw[]>;

export const THREAD_PAGE = 50;

export const THREAD_MAX_PAGES = 4;

export const INITIAL_THREAD_WINDOW: ThreadWindow = { from: null, through: null, pages: 1 };

const NEWEST_FIRST: KeysetSort = { column: 'created_at', order: 'desc' };

const OLDEST_FIRST: KeysetSort = { column: 'created_at', order: 'asc' };

const cursor = (row: KeysetRaw | undefined): KeysetCursor | null => (row ? cursorOf(row, NEWEST_FIRST) : null);

export const isLiveWindow = (window: ThreadWindow): boolean => window.from === null;

export const isHeadWindow = (window: ThreadWindow): boolean => window.from === null && window.through === null;

export const sameThreadWindow = (left: ThreadWindow, right: ThreadWindow): boolean =>
  left.pages === right.pages &&
  left.from?.id === right.from?.id &&
  left.from?.value === right.from?.value &&
  left.through?.id === right.through?.id &&
  left.through?.value === right.through?.value;

export function threadWindowClauses(window: ThreadWindow): Clause[] {
  return [
    ...(window.from ? [keysetThrough(OLDEST_FIRST, window.from)] : []),
    ...(window.through ? [keysetThrough(NEWEST_FIRST, window.through)] : []),
  ];
}

export function olderThanWindow(window: ThreadWindow): Clause | null {
  return window.through ? keysetAfter(NEWEST_FIRST, window.through) : null;
}

async function dropNewestPage(window: ThreadWindow, fetch: ThreadFetch, page: number): Promise<KeysetCursor | null> {
  const rows = await fetch({
    where: window.from ? [keysetThrough(OLDEST_FIRST, window.from)] : [],
    order: 'desc',
    take: page + 1,
  });
  return cursor(rows[page]) ?? window.from;
}

async function dropOldestPage(window: ThreadWindow, fetch: ThreadFetch, page: number): Promise<KeysetCursor | null> {
  if (!window.through) return null;
  const rows = await fetch({ where: [keysetThrough(NEWEST_FIRST, window.through)], order: 'asc', take: page + 1 });
  return cursor(rows[page]) ?? window.through;
}

export async function olderThreadWindow(
  window: ThreadWindow,
  fetch: ThreadFetch,
  page: number = THREAD_PAGE,
  maxPages: number = THREAD_MAX_PAGES
): Promise<ThreadWindow> {
  const rows = window.through
    ? await fetch({ where: [keysetAfter(NEWEST_FIRST, window.through)], order: 'desc', take: page })
    : (await fetch({ where: [], order: 'desc', take: page * 2 })).slice(page);
  const through = cursor(rows[rows.length - 1]);
  if (!through) return window;
  const grown: ThreadWindow = { from: window.from, through, pages: window.pages + 1 };
  if (grown.pages <= maxPages) return grown;
  return { from: await dropNewestPage(grown, fetch, page), through, pages: grown.pages - 1 };
}

export async function newerThreadWindow(
  window: ThreadWindow,
  fetch: ThreadFetch,
  page: number = THREAD_PAGE,
  maxPages: number = THREAD_MAX_PAGES
): Promise<ThreadWindow> {
  if (!window.from) return window;
  const rows = await fetch({ where: [keysetAfter(OLDEST_FIRST, window.from)], order: 'asc', take: page + 1 });
  if (rows.length === 0) return { ...window, from: null };
  const from = rows.length > page ? cursor(rows[page - 1]) : null;
  const grown: ThreadWindow = { from, through: window.through, pages: window.pages + 1 };
  if (grown.pages <= maxPages) return grown;
  return { from, through: await dropOldestPage(grown, fetch, page), pages: grown.pages - 1 };
}
