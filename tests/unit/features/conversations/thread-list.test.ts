import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import {
  arrivedWhileAway,
  dayItemKey,
  dayPillOf,
  estimatedHeightOf,
  estimatedItemSizeOf,
  floatingDayOf,
  followNewItems,
  groupsWith,
  isMessageItem,
  keyboardOffsets,
  prewarmScopesOf,
  THREAD_GROUP_GAP_MS,
  threadItems,
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
  result: null,
  via: null,
  receipt: null,
  voiceNote: null,
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

describe('followNewItems', () => {
  const items = (rows: readonly IConversationMessageCacheRow[], typing = false) =>
    threadItems({ rows, startOfDay, typing });
  const base = thread(10);
  const lastKey = base[base.length - 1]?.id ?? null;
  const incoming = message({ id: '11', createdAt: T0 + 20 * MINUTE });
  const mine = message({ id: '12', direction: 'out', createdAt: T0 + 21 * MINUTE });

  test('the first look records the newest line and moves nothing', () => {
    expect(
      followNewItems({ live: true, items: items(base), lastKey: null, unseen: 0, atEnd: true })
    ).toEqual({
      jump: false,
      unseen: 0,
      lastKey,
    });
  });

  test('at the bottom a new line is followed by the list itself and nothing is counted', () => {
    expect(
      followNewItems({
        live: true,
        items: items([...base, incoming]),
        lastKey,
        unseen: 0,
        atEnd: true,
      })
    ).toEqual({
      jump: false,
      unseen: 0,
      lastKey: '11',
    });
  });

  test('scrolled up, incoming lines are counted for the pill and the view stays where the reader is', () => {
    const first = followNewItems({
      live: true,
      items: items([...base, incoming]),
      lastKey,
      unseen: 0,
      atEnd: false,
    });
    expect(first).toEqual({ jump: false, unseen: 1, lastKey: '11' });
    const later = message({ id: '13', createdAt: T0 + 22 * MINUTE });
    const second = followNewItems({
      live: true,
      items: items([...base, incoming, later]),
      lastKey: first.lastKey,
      unseen: first.unseen,
      atEnd: false,
    });
    expect(second).toEqual({ jump: false, unseen: 2, lastKey: '13' });
  });

  test('a line I send always takes me to the bottom, wherever I was', () => {
    expect(
      followNewItems({
        live: true,
        items: items([...base, incoming, mine]),
        lastKey,
        unseen: 3,
        atEnd: false,
      })
    ).toEqual({
      jump: true,
      unseen: 0,
      lastKey: '12',
    });
  });

  test('reaching the bottom clears the count', () => {
    expect(
      followNewItems({ live: true, items: items(base), lastKey, unseen: 4, atEnd: true }).unseen
    ).toBe(0);
  });

  test('the typing indicator and a row that changed its id are not new lines', () => {
    expect(
      followNewItems({ live: true, items: items(base, true), lastKey, unseen: 0, atEnd: false })
    ).toEqual({
      jump: false,
      unseen: 0,
      lastKey,
    });
    const confirmed = [
      ...base.slice(0, -1),
      { ...base[base.length - 1], id: 'server-10' } as IConversationMessageCacheRow,
    ];
    expect(
      followNewItems({ live: true, items: items(confirmed), lastKey, unseen: 1, atEnd: false })
    ).toEqual({
      jump: false,
      unseen: 1,
      lastKey: 'server-10',
    });
  });

  test('lines a window cut off from the newest reads back while scrolling down are not new lines', () => {
    expect(
      followNewItems({
        live: false,
        items: items([...base, incoming, mine]),
        lastKey,
        unseen: 2,
        atEnd: true,
      })
    ).toEqual({
      jump: false,
      unseen: 2,
      lastKey: '12',
    });
  });

  test('older lines loaded above are not new lines', () => {
    const window = items(base.slice(5));
    const grown = items(base);
    const before = followNewItems({
      live: true,
      items: window,
      lastKey: null,
      unseen: 0,
      atEnd: false,
    });
    expect(
      followNewItems({ live: true, items: grown, lastKey: before.lastKey, unseen: 0, atEnd: false })
    ).toEqual({
      jump: false,
      unseen: 0,
      lastKey,
    });
    expect(grown.filter(isMessageItem)).toHaveLength(10);
  });
});

describe('arrivedWhileAway', () => {
  const incoming = message({ id: '20' });
  const mine = message({ id: '21', direction: 'out' });

  test('a window cut off from the newest line counts each incoming line that becomes the newest', () => {
    expect(arrivedWhileAway({ live: false, previous: '19', newest: incoming })).toBe(1);
  });

  test('nothing counts while the window is live, for my own line, or when the newest did not change', () => {
    expect(arrivedWhileAway({ live: true, previous: '19', newest: incoming })).toBe(0);
    expect(arrivedWhileAway({ live: false, previous: '20', newest: mine })).toBe(0);
    expect(arrivedWhileAway({ live: false, previous: '20', newest: incoming })).toBe(0);
    expect(arrivedWhileAway({ live: false, previous: null, newest: incoming })).toBe(0);
    expect(arrivedWhileAway({ live: false, previous: '20', newest: null })).toBe(0);
  });
});

describe('keyboardOffsets', () => {
  test('the list lifts its content by exactly the distance the composer travels', () => {
    for (const inset of [0, 24, 48]) {
      const offsets = keyboardOffsets(inset);
      for (const keyboard of [0, 280, 340]) {
        const composerTravel = Math.max(keyboard - offsets.sticky.opened, 0);
        const listLift = Math.max(keyboard - offsets.list, 0);
        expect(listLift).toBe(composerTravel);
      }
      expect(offsets.sticky.closed).toBe(0);
    }
  });

  test('the latest arrow rides the keyboard with the composer, so it is never left behind it', () => {
    const offsets = keyboardOffsets(34);
    expect(offsets.pill).toEqual(offsets.sticky);
  });

  test('a negative inset reads as none', () => {
    expect(keyboardOffsets(-5)).toEqual({
      list: 0,
      sticky: { closed: 0, opened: 0 },
      pill: { closed: 0, opened: 0 },
    });
  });
});

describe('the day pill and the size estimate', () => {
  test("the pill floats with the day of the first visible line, and hides while that line's separator tops the list", () => {
    const items = threadItems({
      rows: [message({ id: '1' }), message({ id: '2', createdAt: T0 + DAY })],
      startOfDay,
      typing: false,
    });
    const [firstDay, first, secondDay, second] = items as ThreadItem[];
    expect(floatingDayOf([first as ThreadItem])).toBe(startOfDay(T0));
    expect(floatingDayOf([first as ThreadItem, secondDay as ThreadItem])).toBe(startOfDay(T0));
    expect(floatingDayOf([firstDay as ThreadItem, first as ThreadItem])).toBeNull();
    expect(floatingDayOf([secondDay as ThreadItem, second as ThreadItem])).toBeNull();
    expect(floatingDayOf([])).toBeNull();
  });

  test('the pill shows only while the user scrolls away from the newest line', () => {
    expect(dayPillOf({ day: T0, scrolling: true, atEnd: false })).toBe(T0);
    expect(dayPillOf({ day: T0, scrolling: false, atEnd: false })).toBeNull();
    expect(dayPillOf({ day: T0, scrolling: true, atEnd: true })).toBeNull();
    expect(dayPillOf({ day: null, scrolling: true, atEnd: false })).toBeNull();
  });

  test('a long message is estimated taller than a short one, a note and a day at their fixed sizes', () => {
    const items = threadItems({
      rows: [
        message({ id: '1', body: 'Hola' }),
        message({ id: '2', body: 'palabra '.repeat(60), createdAt: T0 + MINUTE }),
      ],
      startOfDay,
      typing: true,
    });
    const [day, short, long, typing] = items as ThreadItem[];
    expect(estimatedHeightOf(long as ThreadItem, 360)).toBeGreaterThan(
      estimatedHeightOf(short as ThreadItem, 360)
    );
    expect(estimatedHeightOf(long as ThreadItem, 1440)).toBeLessThan(
      estimatedHeightOf(long as ThreadItem, 360)
    );
    expect(estimatedHeightOf(day as ThreadItem, 360)).toBe(40);
    expect(estimatedHeightOf(typing as ThreadItem, 360)).toBe(40);
    expect(estimatedItemSizeOf({ items: [], width: 360 })).toBe(72);
  });

  test('Argus and the recent threads are warmed first, each once', () => {
    expect(prewarmScopesOf([3, 0, 5, 3])).toEqual(['0', '3', '5']);
    expect(prewarmScopesOf([1, 2, 3, 4, 5, 6, 7], 3)).toEqual(['0', '1', '2']);
  });
});
