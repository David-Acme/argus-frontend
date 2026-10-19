import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow, IConversationSummaryCacheRow } from '@/core/interfaces';
import {
  projectConversations,
  summarizeConversations,
  groupThreads,
  toConversationRow,
  type ConversationMessageSource,
} from '@/core/services/view-cache/conversation.projection';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';

const T0 = Date.UTC(2026, 9, 19, 12, 0, 0);
const MINUTE = 60_000;

const source = (patch: Partial<ConversationMessageSource> & { id: string }): ConversationMessageSource => ({
  counterpartId: '3',
  counterpartName: 'David',
  direction: 'in',
  kind: 'relay',
  body: 'Hola',
  leg: null,
  state: 'received',
  messageKey: `key-${patch.id}`,
  replyToKey: null,
  isRead: true,
  createdAt: new Date(T0),
  ...patch,
});

const rowsOf = (writes: ReturnType<typeof projectConversations>, key: string, scope?: string): unknown[] => {
  const write = writes.find((candidate) => candidate.key === key && candidate.scope === scope);
  return write && 'rows' in write ? [...write.rows] : [];
};

const valueOf = (writes: ReturnType<typeof projectConversations>, key: string): unknown => {
  const write = writes.find((candidate) => candidate.key === key);
  return write && 'value' in write ? write.value : undefined;
};

describe('toConversationRow', () => {
  test('reads the counterpart as a number and the time in milliseconds', () => {
    const row = toConversationRow(source({ id: '1', counterpartId: '0', counterpartName: '', kind: 'turn', leg: 'phone' }));
    expect(row.counterpartId).toBe(0);
    expect(row.leg).toBe('phone');
    expect(row.createdAt).toBe(T0);
  });

  test('a counterpart that is not a number is read as Argus rather than dropped', () => {
    expect(toConversationRow(source({ id: '1', counterpartId: 'x' })).counterpartId).toBe(0);
  });
});

describe('groupThreads', () => {
  test('one thread per counterpart, oldest first, ties broken by id', () => {
    const threads = groupThreads(
      [
        source({ id: '12', createdAt: new Date(T0 + MINUTE) }),
        source({ id: '10', createdAt: new Date(T0 + MINUTE) }),
        source({ id: '9', createdAt: new Date(T0) }),
        source({ id: '20', counterpartId: '0', counterpartName: '' }),
      ].map(toConversationRow)
    );
    expect(threads.get(3)?.map((row) => row.id)).toEqual(['9', '10', '12']);
    expect(threads.get(0)?.map((row) => row.id)).toEqual(['20']);
  });
});

describe('summarizeConversations', () => {
  const summaries = (): IConversationSummaryCacheRow[] =>
    summarizeConversations(
      groupThreads(
        [
          source({ id: '1', counterpartId: '0', counterpartName: '', kind: 'turn', direction: 'out', createdAt: new Date(T0) }),
          source({ id: '2', counterpartId: '3', createdAt: new Date(T0 + 5 * MINUTE), isRead: false }),
          source({ id: '3', counterpartId: '3', createdAt: new Date(T0 + 6 * MINUTE), isRead: false }),
          source({
            id: '4',
            counterpartId: '5',
            counterpartName: 'Ana',
            direction: 'out',
            state: 'notified',
            createdAt: new Date(T0 + 9 * MINUTE),
          }),
          source({
            id: '5',
            counterpartId: '5',
            counterpartName: 'Ana',
            direction: 'in',
            kind: 'reply',
            replyToKey: 'key-4',
            createdAt: new Date(T0 + 10 * MINUTE),
          }),
        ].map(toConversationRow)
      )
    );

  test('Argus comes first when it has rows, then the members by their last line', () => {
    expect(summaries().map((summary) => summary.counterpartId)).toEqual([0, 5, 3]);
  });

  test('counts only incoming rows not yet read', () => {
    expect(summaries().map((summary) => summary.unread)).toEqual([0, 0, 2]);
  });

  test('keeps the last outgoing relay or reply for its delivery state, never a turn', () => {
    const [argus, ana, david] = summaries();
    expect(argus?.lastSent).toBeNull();
    expect(ana?.lastSent?.id).toBe('4');
    expect(ana?.last.id).toBe('5');
    expect(david?.lastSent).toBeNull();
  });

  test('the name is the newest non-blank one the thread carried', () => {
    const [summary] = summarizeConversations(
      groupThreads(
        [
          source({ id: '1', counterpartName: 'Dave', createdAt: new Date(T0) }),
          source({ id: '2', counterpartName: ' ', createdAt: new Date(T0 + MINUTE) }),
        ].map(toConversationRow)
      )
    );
    expect(summary?.counterpartName).toBe('Dave');
  });

  test('Argus is not listed when it has no rows', () => {
    const list = summarizeConversations(groupThreads([source({ id: '1' })].map(toConversationRow)));
    expect(list.map((summary) => summary.counterpartId)).toEqual([3]);
  });
});

describe('projectConversations', () => {
  test('writes the list, the total unread and one thread per counterpart', () => {
    const writes = projectConversations({
      conversations: [
        source({ id: '1', isRead: false }),
        source({ id: '2', counterpartId: '0', counterpartName: '', kind: 'turn', direction: 'out' }),
      ],
    });
    expect(
      (rowsOf(writes, VIEW_CACHE_KEYS.conversationList) as IConversationSummaryCacheRow[]).map((row) => row.counterpartId)
    ).toEqual([0, 3]);
    expect(valueOf(writes, VIEW_CACHE_KEYS.conversationUnread)).toBe(1);
    expect(
      (rowsOf(writes, VIEW_CACHE_KEYS.conversationThread, '3') as IConversationMessageCacheRow[]).map((row) => row.id)
    ).toEqual(['1']);
    expect(
      (rowsOf(writes, VIEW_CACHE_KEYS.conversationThread, '0') as IConversationMessageCacheRow[]).map((row) => row.id)
    ).toEqual(['2']);
  });

  test('a long thread keeps its newest rows, never its oldest', () => {
    const many = Array.from({ length: VIEW_CACHE_LIST_LIMIT + 3 }, (_, index) =>
      source({ id: String(index + 1), createdAt: new Date(T0 + index * MINUTE) })
    );
    const thread = rowsOf(projectConversations({ conversations: many }), VIEW_CACHE_KEYS.conversationThread, '3') as IConversationMessageCacheRow[];
    expect(thread).toHaveLength(VIEW_CACHE_LIST_LIMIT);
    expect(thread[0]?.id).toBe('4');
    expect(thread.at(-1)?.id).toBe(String(VIEW_CACHE_LIST_LIMIT + 3));
  });

  test('no rows writes an empty list and zero unread', () => {
    const writes = projectConversations({ conversations: [] });
    expect(rowsOf(writes, VIEW_CACHE_KEYS.conversationList)).toEqual([]);
    expect(valueOf(writes, VIEW_CACHE_KEYS.conversationUnread)).toBe(0);
  });
});
