import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow, IConversationSummaryCacheRow, IConversationThreadCache } from '@/core/interfaces';
import {
  projectConversations,
  projectConversationThread,
  summaryOf,
  toConversationRow,
  type ConversationMessageSource,
  type ConversationSummaryFacts,
} from '@/core/services/view-cache/conversation.projection';
import { VIEW_CACHE_KEYS } from '@/shared/constants/cache.constant';

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
  result: null,
  via: null,
  receipt: null,
  voiceNote: null,
  isRead: true,
  createdAt: new Date(T0),
  ...patch,
});

const rowsOf = (writes: ReturnType<typeof projectConversations>, key: string, scope?: string): unknown[] => {
  const write = writes.find((candidate) => candidate.key === key && candidate.scope === scope);
  return write && 'rows' in write ? [...write.rows] : [];
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

const facts = (patch: Partial<ConversationSummaryFacts> & { counterpartId: string; last: ConversationMessageSource }): ConversationSummaryFacts => ({
  lastSent: null,
  lastNamed: null,
  unread: 0,
  ...patch,
});

describe('summaryOf', () => {
  test('a summary is built from the newest line, the unread count and the last sent letter, never from the whole thread', () => {
    const summary = summaryOf(
      facts({
        counterpartId: '5',
        last: source({ id: '9', counterpartId: '5', counterpartName: ' ', kind: 'reply', createdAt: new Date(T0 + MINUTE) }),
        lastSent: source({ id: '8', counterpartId: '5', direction: 'out', state: 'notified' }),
        lastNamed: source({ id: '7', counterpartId: '5', counterpartName: 'Ana ' }),
        unread: 2,
      })
    );
    expect(summary.counterpartId).toBe(5);
    expect(summary.counterpartName).toBe('Ana');
    expect(summary.unread).toBe(2);
    expect(summary.last.id).toBe('9');
    expect(summary.lastSent?.id).toBe('8');
  });

  test('a thread with no named line and nothing sent reads blank and null', () => {
    const summary = summaryOf(facts({ counterpartId: '0', last: source({ id: '1', counterpartId: '0', counterpartName: '' }) }));
    expect(summary.counterpartName).toBe('');
    expect(summary.lastSent).toBeNull();
  });
});

describe('projectConversations', () => {
  test('writes the list with Argus first and then the members by their last line', () => {
    const writes = projectConversations({
      summaries: [
        facts({ counterpartId: '3', last: source({ id: '3', createdAt: new Date(T0 + 6 * MINUTE) }), unread: 2 }),
        facts({ counterpartId: '5', last: source({ id: '5', counterpartId: '5', createdAt: new Date(T0 + 10 * MINUTE) }) }),
        facts({ counterpartId: '0', last: source({ id: '1', counterpartId: '0', counterpartName: '', kind: 'turn' }), unread: 1 }),
      ],
    });
    expect(
      (rowsOf(writes, VIEW_CACHE_KEYS.conversationList) as IConversationSummaryCacheRow[]).map((row) => row.counterpartId)
    ).toEqual([0, 5, 3]);
    expect(writes.some((write) => write.key === VIEW_CACHE_KEYS.conversationThread)).toBe(false);
  });

  test('no rows writes an empty list', () => {
    const writes = projectConversations({ summaries: [] });
    expect(rowsOf(writes, VIEW_CACHE_KEYS.conversationList)).toEqual([]);
  });
});

describe('projectConversationThread', () => {
  test('writes only the window it was given, oldest first, with what lies beyond it on each side', () => {
    const [write] = projectConversationThread(
      {
        rows: [source({ id: '3', createdAt: new Date(T0 + 2 * MINUTE) }), source({ id: '2', createdAt: new Date(T0 + MINUTE) })],
        older: true,
        live: false,
      },
      '3'
    );
    expect(write?.key).toBe(VIEW_CACHE_KEYS.conversationThread);
    expect(write?.scope).toBe('3');
    const value = (write && 'value' in write ? write.value : null) as IConversationThreadCache | null;
    expect(value?.rows.map((row: IConversationMessageCacheRow) => row.id)).toEqual(['2', '3']);
    expect(value?.hasOlder).toBe(true);
    expect(value?.live).toBe(false);
  });
});
