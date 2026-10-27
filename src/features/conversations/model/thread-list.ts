import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { ArgusResult } from '@/features/voice';
import type { AnchoredResults } from '@/features/conversations/model/thread-results';

export type ThreadDayItem = { type: 'day'; key: string; day: number };

export type ThreadMessageItem = {
  type: 'message';
  key: string;
  day: number;
  message: IConversationMessageCacheRow;
  groupStart: boolean;
  groupEnd: boolean;
};

export type ThreadTypingItem = { type: 'typing'; key: string };

export type ThreadResultItem = { type: 'result'; key: string; result: ArgusResult };

export type ThreadItem = ThreadDayItem | ThreadMessageItem | ThreadResultItem | ThreadTypingItem;

export type ThreadItemsInput = {
  rows: readonly IConversationMessageCacheRow[];
  startOfDay: (at: number) => number;
  typing: boolean;
  results?: AnchoredResults;
  gapMs?: number;
};

export type FollowInput = {
  live: boolean;
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

export type StickyOffset = { closed: number; opened: number };

export type KeyboardOffsets = {
  list: number;
  sticky: StickyOffset;
  pill: StickyOffset;
};

export const THREAD_GROUP_GAP_MS = 5 * 60 * 1000;

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

const resultItem = (result: ArgusResult): ThreadResultItem => ({
  type: 'result',
  key: `result:${result.id}`,
  result,
});

function pushResults(items: ThreadItem[], results: readonly ArgusResult[] | undefined): boolean {
  for (const result of results ?? []) items.push(resultItem(result));
  return (results?.length ?? 0) > 0;
}

export function threadItems({
  rows,
  startOfDay,
  typing,
  results,
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
      day,
      message,
      groupStart: !joins,
      groupEnd: true,
    };
    items.push(item);
    previous = item;
    previousDay = day;
    if (pushResults(items, results?.byRow.get(message.id))) previous = null;
  }
  pushResults(items, results?.trailing);
  if (typing) items.push({ type: 'typing', key: TYPING_ITEM_KEY });
  return items;
}

export function followNewItems({
  live,
  items,
  lastKey,
  unseen,
  atEnd,
}: FollowInput): FollowDecision {
  const messages = items.filter(isMessageItem);
  const newest = messages[messages.length - 1]?.key ?? null;
  if (!live) return { jump: false, unseen, lastKey: newest };
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

export type ArrivalInput = {
  live: boolean;
  previous: string | null;
  newest: Pick<IConversationMessageCacheRow, 'id' | 'direction'> | null;
};

export function arrivedWhileAway({ live, previous, newest }: ArrivalInput): number {
  if (live || previous === null || newest === null) return 0;
  if (newest.id === previous || newest.direction !== 'in') return 0;
  return 1;
}

export function keyboardOffsets(bottomInset: number): KeyboardOffsets {
  const inset = Math.max(bottomInset, 0);
  const sticky = { closed: 0, opened: inset };
  return { list: inset, sticky, pill: { ...sticky } };
}

export type StickyKeyboardEvent = 'show' | 'resume' | 'leave';

export function stickyKeyboardStep(
  enabled: boolean,
  event: StickyKeyboardEvent,
  keyboardShown: boolean
): boolean {
  if (event === 'show') return true;
  if (event === 'leave') return false;
  return enabled && keyboardShown;
}

export function floatingDayOf(viewable: readonly ThreadItem[]): number | null {
  if (viewable[0]?.type === 'day') return null;
  const first = viewable.find(isMessageItem);
  return first ? first.day : null;
}

export type DayPillInput = { day: number | null; scrolling: boolean; atEnd: boolean };

export function dayPillOf({ day, scrolling, atEnd }: DayPillInput): number | null {
  return scrolling && !atEnd ? day : null;
}

export type EstimateInput = { items: readonly ThreadItem[]; width: number };

export const ESTIMATE = {
  line: 22,
  bubblePad: 20,
  groupGap: 12,
  day: 40,
  typing: 40,
  result: 168,
  note: 76,
  charWidth: 7.6,
  bubbleShare: 0.82,
  bubbleInset: 24,
  fallback: 72,
} as const;

export function estimatedHeightOf(item: ThreadItem, width: number): number {
  if (item.type === 'day') return ESTIMATE.day;
  if (item.type === 'typing') return ESTIMATE.typing;
  if (item.type === 'result') return ESTIMATE.result;
  const gap = item.groupStart ? ESTIMATE.groupGap : ESTIMATE.groupGap / 3;
  if (item.message.voiceNote) return ESTIMATE.note + gap;
  const usable = Math.max(1, width * ESTIMATE.bubbleShare - ESTIMATE.bubbleInset);
  const perLine = Math.max(1, Math.floor(usable / ESTIMATE.charWidth));
  const lines = item.message.body
    .split('\n')
    .reduce((count, line) => count + Math.max(1, Math.ceil(line.length / perLine)), 0);
  return lines * ESTIMATE.line + ESTIMATE.bubblePad + gap;
}

export function estimatedItemSizeOf({ items, width }: EstimateInput): number {
  if (items.length === 0 || width <= 0) return ESTIMATE.fallback;
  const total = items.reduce((sum, item) => sum + estimatedHeightOf(item, width), 0);
  return Math.round(total / items.length);
}

export const THREAD_TAIL = 30;

export const PREWARMED_THREADS = 6;

export function prewarmScopesOf(
  counterpartIds: readonly number[],
  kept: number = PREWARMED_THREADS
): string[] {
  return [...new Set([0, ...counterpartIds])].slice(0, kept).map(String);
}
