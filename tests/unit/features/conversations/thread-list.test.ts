import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import {
  dayItemKey,
  followNewItems,
  groupsWith,
  isMessageItem,
  olderWindowStart,
  THREAD_GROUP_GAP_MS,
  threadItems,
  threadWindow,
  TYPING_ITEM_KEY,
  type ThreadItem,
} from '@/features/conversations/model/thread-list';

const MINUTE = 60_000;
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 19, 9, 0, 0);

const startOfDay = (at: number): number => at - (at % DAY);

const message = (
  patch: Partial<IConversationMessageCacheRow> & { id: string }
): IConversationMessageCacheRow => ({
  counterpartId: 0,
  counterpartName: '',
  direction: 'in',
  kind: 'turn',
  body: `body ${patch.id}`,
  leg: null,
  state: 'delivered',
  messageKey: `key-${patch.id}`,
  replyToKey: null,
  isRead: true,
  createdAt: T0,
  ...patch,
});

const shape = (items: readonly ThreadItem[]): string[] =>
  items.map((item) =>
    item.type === 'message'
      ? `${item.key}${item.groupStart ? '[' : ''}${item.groupEnd ? ']' : ''}`
      : item.key
  );

const thread = (count: number): IConversationMessageCacheRow[] =>
  Array.from({ length: count }, (_, index) =>
    message({
      id: String(index + 1),
      createdAt: T0 + index * MINUTE,
      direction: index % 3 === 0 ? 'out' : 'in',
    })
  );

describe('groupsWith', () => {
  test('consecutive lines from the same side within the gap join one group', () => {
    expect(
      groupsWith(message({ id: '1' }), message({ id: '2', createdAt: T0 + THREAD_GROUP_GAP_MS }))
    ).toBe(true);
  });

  test('a change of side, a longer pause, a visitor notice or a line out of order starts a new group', () => {
    expect(groupsWith(message({ id: '1' }), message({ id: '2', direction: 'out' }))).toBe(false);
    expect(
      groupsWith(
        message({ id: '1' }),
        message({ id: '2', createdAt: T0 + THREAD_GROUP_GAP_MS + 1 })
      )
    ).toBe(false);
    expect(groupsWith(message({ id: '1', kind: 'visitor' }), message({ id: '2' }))).toBe(false);
    expect(groupsWith(message({ id: '1' }), message({ id: '2', kind: 'visitor' }))).toBe(false);
    expect(groupsWith(message({ id: '1' }), message({ id: '2', createdAt: T0 - 1 }))).toBe(false);
  });
});

describe('threadItems', () => {
  test('each day opens with its separator and consecutive bubbles are grouped', () => {
    const rows = [
      message({ id: '1', direction: 'out' }),
      message({ id: '2', direction: 'out', createdAt: T0 + MINUTE }),
      message({ id: '3', createdAt: T0 + 2 * MINUTE }),
      message({ id: '4', createdAt: T0 + DAY }),
      message({ id: '5', createdAt: T0 + DAY + MINUTE }),
      message({ id: '6', createdAt: T0 + DAY + 20 * MINUTE }),
    ];
    expect(shape(threadItems({ rows, startOfDay, typing: false }))).toEqual([
      dayItemKey(startOfDay(T0)),
      '1[',
      '2]',
      '3[]',
      dayItemKey(startOfDay(T0 + DAY)),
      '4[',
      '5]',
      '6[]',
    ]);
  });

  test('a group never crosses midnight even when the lines are a minute apart', () => {
    const midnight = startOfDay(T0) + DAY;
    const rows = [
      message({ id: '1', createdAt: midnight - 30_000 }),
      message({ id: '2', createdAt: midnight + 30_000 }),
    ];
    expect(shape(threadItems({ rows, startOfDay, typing: false }))).toEqual([
      dayItemKey(startOfDay(T0)),
      '1[]',
      dayItemKey(midnight),
      '2[]',
    ]);
  });

  test('the typing indicator is the last row, and only while Argus is answering', () => {
    const rows = [message({ id: '1', direction: 'out' })];
    expect(threadItems({ rows, startOfDay, typing: true }).at(-1)).toEqual({
      type: 'typing',
      key: TYPING_ITEM_KEY,
    });
    expect(
      threadItems({ rows, startOfDay, typing: false }).some((item) => item.type === 'typing')
    ).toBe(false);
    expect(shape(threadItems({ rows: [], startOfDay, typing: true }))).toEqual([TYPING_ITEM_KEY]);
  });

  test('every key is unique, so the list can keep each row in place', () => {
    const items = threadItems({ rows: thread(500), startOfDay, typing: true });
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
  });
});

describe('threadWindow', () => {
  test('a thread opens on its newest page', () => {
    const rows = thread(150);
    const window = threadWindow(rows, null, 60);
    expect(window.rows.map((row) => row.id)).toEqual(rows.slice(90).map((row) => row.id));
    expect(window.hasOlder).toBe(true);
    expect(window.oldestAt).toBe(rows[90]?.createdAt ?? null);
  });

  test('a short thread is shown whole and has nothing older', () => {
    const rows = thread(20);
    const window = threadWindow(rows, null, 60);
    expect(window.rows).toBe(rows);
    expect(window.hasOlder).toBe(false);
  });

  test('the window is held by its oldest line, so new lines at the end never push rows out of the top', () => {
    const rows = thread(150);
    const opened = threadWindow(rows, null, 60);
    const grown = [
      ...rows,
      message({ id: '151', createdAt: T0 + 150 * MINUTE }),
      message({ id: '152', createdAt: T0 + 151 * MINUTE }),
    ];
    const after = threadWindow(grown, opened.oldestAt, 60);
    expect(after.rows[0]?.id).toBe(opened.rows[0]?.id);
    expect(after.rows.length).toBe(opened.rows.length + 2);
  });

  test('loading older lines only adds rows before the anchor, which stays where it was in the list', () => {
    const rows = thread(150);
    const opened = threadWindow(rows, null, 60);
    const anchor = opened.rows[0]?.id;
    const older = threadWindow(rows, olderWindowStart(rows, opened.oldestAt, 60), 60);
    const anchorIndex = older.rows.findIndex((row) => row.id === anchor);
    expect(anchorIndex).toBe(60);
    expect(older.rows.slice(anchorIndex).map((row) => row.id)).toEqual(
      opened.rows.map((row) => row.id)
    );
    const oldest = threadWindow(rows, olderWindowStart(rows, older.oldestAt, 60), 60);
    expect(oldest.rows).toBe(rows);
    expect(oldest.hasOlder).toBe(false);
    expect(olderWindowStart(rows, oldest.oldestAt, 60)).toBe(rows[0]?.createdAt ?? null);
  });

  test('lines that share a second never stall the paging', () => {
    const rows = Array.from({ length: 130 }, (_, index) =>
      message({ id: String(index + 1), createdAt: T0 + (index < 100 ? 0 : index) })
    );
    const opened = threadWindow(rows, null, 60);
    const next = olderWindowStart(rows, opened.oldestAt, 60);
    expect(threadWindow(rows, next, 60).rows.length).toBeGreaterThan(opened.rows.length);
  });

  test('an anchor that was deleted falls back to the first newer line', () => {
    const rows = thread(150);
    const window = threadWindow(
      rows.filter((row) => row.id !== '91'),
      rows[90]?.createdAt ?? null,
      60
    );
    expect(window.rows[0]?.id).toBe('92');
  });
});

describe('followNewItems', () => {
  const items = (rows: readonly IConversationMessageCacheRow[], typing = false) =>
    threadItems({ rows, startOfDay, typing });
  const base = thread(10);
  const lastKey = base[base.length - 1]?.id ?? null;
  const incoming = message({ id: '11', createdAt: T0 + 20 * MINUTE });
  const mine = message({ id: '12', direction: 'out', createdAt: T0 + 21 * MINUTE });

  test('the first look records the newest line and moves nothing', () => {
    expect(followNewItems({ items: items(base), lastKey: null, unseen: 0, atEnd: true })).toEqual({
      jump: false,
      unseen: 0,
      lastKey,
    });
  });

  test('at the bottom a new line is followed by the list itself and nothing is counted', () => {
    expect(
      followNewItems({ items: items([...base, incoming]), lastKey, unseen: 0, atEnd: true })
    ).toEqual({
      jump: false,
      unseen: 0,
      lastKey: '11',
    });
  });

  test('scrolled up, incoming lines are counted for the pill and the view stays where the reader is', () => {
    const first = followNewItems({
      items: items([...base, incoming]),
      lastKey,
      unseen: 0,
      atEnd: false,
    });
    expect(first).toEqual({ jump: false, unseen: 1, lastKey: '11' });
    const later = message({ id: '13', createdAt: T0 + 22 * MINUTE });
    const second = followNewItems({
      items: items([...base, incoming, later]),
      lastKey: first.lastKey,
      unseen: first.unseen,
      atEnd: false,
    });
    expect(second).toEqual({ jump: false, unseen: 2, lastKey: '13' });
  });

  test('a line I send always takes me to the bottom, wherever I was', () => {
    expect(
      followNewItems({ items: items([...base, incoming, mine]), lastKey, unseen: 3, atEnd: false })
    ).toEqual({
      jump: true,
      unseen: 0,
      lastKey: '12',
    });
  });

  test('reaching the bottom clears the count', () => {
    expect(followNewItems({ items: items(base), lastKey, unseen: 4, atEnd: true }).unseen).toBe(0);
  });

  test('the typing indicator and a row that changed its id are not new lines', () => {
    expect(followNewItems({ items: items(base, true), lastKey, unseen: 0, atEnd: false })).toEqual({
      jump: false,
      unseen: 0,
      lastKey,
    });
    const confirmed = [
      ...base.slice(0, -1),
      { ...base[base.length - 1], id: 'server-10' } as IConversationMessageCacheRow,
    ];
    expect(followNewItems({ items: items(confirmed), lastKey, unseen: 1, atEnd: false })).toEqual({
      jump: false,
      unseen: 1,
      lastKey: 'server-10',
    });
  });

  test('older lines loaded above are not new lines', () => {
    const window = items(base.slice(5));
    const grown = items(base);
    const before = followNewItems({ items: window, lastKey: null, unseen: 0, atEnd: false });
    expect(
      followNewItems({ items: grown, lastKey: before.lastKey, unseen: 0, atEnd: false })
    ).toEqual({
      jump: false,
      unseen: 0,
      lastKey,
    });
    expect(grown.filter(isMessageItem)).toHaveLength(10);
  });
});
