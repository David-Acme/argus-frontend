import type { IConversationMessageCacheRow } from '@/core/interfaces';

export type ThreadDayItem = { type: 'day'; key: string; day: number };

export type ThreadMessageItem = {
  type: 'message';
  key: string;
  message: IConversationMessageCacheRow;
  groupStart: boolean;
  groupEnd: boolean;
};

export type ThreadTypingItem = { type: 'typing'; key: string };

export type ThreadItem = ThreadDayItem | ThreadMessageItem | ThreadTypingItem;

export type ThreadItemsInput = {
  rows: readonly IConversationMessageCacheRow[];
  startOfDay: (at: number) => number;
  typing: boolean;
  gapMs?: number;
};

export type ThreadWindow = {
  rows: readonly IConversationMessageCacheRow[];
  hasOlder: boolean;
  oldestAt: number | null;
};

export type FollowInput = {
  items: readonly ThreadItem[];
  lastKey: string | null;
  unseen: number;
  atEnd: boolean;
};

export type FollowDecision = {
  jump: boolean;
  unseen: number;
  lastKey: string | null;
};

export const THREAD_GROUP_GAP_MS = 5 * 60 * 1000;

export const THREAD_WINDOW_PAGE = 60;

export const TYPING_ITEM_KEY = 'typing';

export const dayItemKey = (day: number): string => `day:${day}`;

export const isMessageItem = (item: ThreadItem): item is ThreadMessageItem =>
  item.type === 'message';

export function groupsWith(
  previous: Pick<IConversationMessageCacheRow, 'direction' | 'kind' | 'createdAt'>,
  next: Pick<IConversationMessageCacheRow, 'direction' | 'kind' | 'createdAt'>,
  gapMs: number = THREAD_GROUP_GAP_MS
): boolean {
  if (previous.direction !== next.direction) return false;
  if (previous.kind === 'visitor' || next.kind === 'visitor') return false;
  const gap = next.createdAt - previous.createdAt;
  return gap >= 0 && gap <= gapMs;
}

export function threadItems({
  rows,
  startOfDay,
  typing,
  gapMs = THREAD_GROUP_GAP_MS,
}: ThreadItemsInput): ThreadItem[] {
  const items: ThreadItem[] = [];
  let previous: ThreadMessageItem | null = null;
  let previousDay: number | null = null;
  for (const message of rows) {
    const day = startOfDay(message.createdAt);
    const newDay = day !== previousDay;
    if (newDay) items.push({ type: 'day', key: dayItemKey(day), day });
    const joins = !newDay && previous !== null && groupsWith(previous.message, message, gapMs);
    if (joins && previous) previous.groupEnd = false;
    const item: ThreadMessageItem = {
      type: 'message',
      key: message.id,
      message,
      groupStart: !joins,
      groupEnd: true,
    };
    items.push(item);
    previous = item;
    previousDay = day;
  }
  if (typing) items.push({ type: 'typing', key: TYPING_ITEM_KEY });
  return items;
}

function windowStart(
  rows: readonly IConversationMessageCacheRow[],
  oldestAt: number | null,
  page: number
): number {
  const found = oldestAt === null ? -1 : rows.findIndex((row) => row.createdAt >= oldestAt);
  return found < 0 ? Math.max(0, rows.length - page) : found;
}

export function threadWindow(
  rows: readonly IConversationMessageCacheRow[],
  oldestAt: number | null,
  page: number = THREAD_WINDOW_PAGE
): ThreadWindow {
  const start = windowStart(rows, oldestAt, page);
  return {
    rows: start === 0 ? rows : rows.slice(start),
    hasOlder: start > 0,
    oldestAt: rows[start]?.createdAt ?? null,
  };
}

export function olderWindowStart(
  rows: readonly IConversationMessageCacheRow[],
  oldestAt: number | null,
  page: number = THREAD_WINDOW_PAGE
): number | null {
  const start = windowStart(rows, oldestAt, page);
  return rows[Math.max(0, start - page)]?.createdAt ?? null;
}

export function followNewItems({ items, lastKey, unseen, atEnd }: FollowInput): FollowDecision {
  const messages = items.filter(isMessageItem);
  const newest = messages[messages.length - 1]?.key ?? null;
  const kept = atEnd ? 0 : unseen;
  if (lastKey === null || newest === lastKey) return { jump: false, unseen: kept, lastKey: newest };
  const index = messages.findIndex((item) => item.key === lastKey);
  const fresh = index < 0 ? [] : messages.slice(index + 1);
  if (fresh.length === 0) return { jump: false, unseen: kept, lastKey: newest };
  if (atEnd) return { jump: false, unseen: 0, lastKey: newest };
  if (fresh.some((item) => item.message.direction === 'out'))
    return { jump: true, unseen: 0, lastKey: newest };
  return { jump: false, unseen: kept + fresh.length, lastKey: newest };
}
