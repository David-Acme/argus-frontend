import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { AssistantChatEntry } from '@/core/types';
import {
  chatOverlay,
  chatReplyRowId,
  chatRowId,
} from '@/features/conversations/model/assistant-chat-overlay';
import {
  chatErrorCode,
  chatErrorMessage,
} from '@/features/conversations/model/assistant-chat-errors';

const SKEW = 60_000;

const row = (
  facts: Partial<IConversationMessageCacheRow> & Pick<IConversationMessageCacheRow, 'id'>
): IConversationMessageCacheRow => ({
  counterpartId: 0,
  counterpartName: '',
  direction: 'out',
  kind: 'turn',
  body: '',
  leg: 'phone',
  state: 'delivered',
  messageKey: '',
  replyToKey: null,
  result: null,
  via: null,
  receipt: null,
  voiceNote: null,
  isRead: true,
  createdAt: 0,
  ...facts,
});

const entry = (facts: Partial<AssistantChatEntry> = {}): AssistantChatEntry => ({
  clientId: 'c1',
  text: '¿quién está en casa?',
  sentAt: 10_000,
  status: 'waiting',
  reply: '',
  turnId: null,
  error: null,
  ...facts,
});

const spoken = row({
  id: '1',
  direction: 'out',
  body: 'buenos días',
  leg: 'phone',
  createdAt: 1_000,
});

describe('typed turns over the synced thread', () => {
  test('the typed message shows at once after the spoken history, with Argus typing', () => {
    const overlay = chatOverlay({
      messages: [spoken],
      entries: [entry()],
      leg: 'laptop',
      skewMs: SKEW,
    });
    expect(overlay.rows.map((message) => message.id)).toEqual(['1', chatRowId('c1')]);
    expect(overlay.rows[1]).toMatchObject({
      direction: 'out',
      kind: 'turn',
      body: '¿quién está en casa?',
      leg: 'laptop',
    });
    expect(overlay.typing).toBe(true);
    expect(overlay.marks.size).toBe(0);
  });

  test('the reply shows as an incoming bubble while it streams and the typing stops when the turn is done', () => {
    const streaming = chatOverlay({
      messages: [],
      entries: [entry({ reply: 'Ana está en casa.' })],
      leg: 'phone',
      skewMs: SKEW,
    });
    expect(streaming.rows.map((message) => [message.id, message.direction])).toEqual([
      [chatRowId('c1'), 'out'],
      [chatReplyRowId('c1'), 'in'],
    ]);
    expect(streaming.typing).toBe(true);
    const done = chatOverlay({
      messages: [],
      entries: [entry({ reply: 'Ana está en casa.', status: 'done' })],
      leg: 'phone',
      skewMs: SKEW,
    });
    expect(done.typing).toBe(false);
  });

  test('once the backend stores the turn, the synced rows replace the live ones', () => {
    const synced = [
      spoken,
      row({ id: '2', direction: 'out', body: '¿quién está en casa?', createdAt: 10_400 }),
      row({ id: '3', direction: 'in', body: 'Ana está en casa. David salió.', createdAt: 11_000 }),
    ];
    const overlay = chatOverlay({
      messages: synced,
      entries: [entry({ reply: 'Ana está en casa.  David salió.', status: 'done' })],
      leg: 'phone',
      skewMs: SKEW,
    });
    expect(overlay.rows).toBe(synced);
  });

  test('a stored spoken line with the same words from long before is not mistaken for the typed one', () => {
    const old = row({
      id: '9',
      direction: 'out',
      body: '¿quién está en casa?',
      createdAt: 10_000 - SKEW - 1,
    });
    const overlay = chatOverlay({
      messages: [old],
      entries: [entry()],
      leg: 'phone',
      skewMs: SKEW,
    });
    expect(overlay.rows.map((message) => message.id)).toEqual(['9', chatRowId('c1')]);
  });

  test('a sending message is dimmed and a failed one carries its error for the retry', () => {
    const overlay = chatOverlay({
      messages: [],
      entries: [
        entry({ clientId: 'a', status: 'sending' }),
        entry({
          clientId: 'b',
          text: 'otra',
          sentAt: 12_000,
          status: 'failed',
          error: 'SOCKET_LOST|gone',
        }),
      ],
      leg: 'phone',
      skewMs: SKEW,
    });
    expect(overlay.marks.get(chatRowId('a'))).toEqual({
      clientId: 'a',
      status: 'sending',
      error: null,
    });
    expect(overlay.marks.get(chatRowId('b'))).toEqual({
      clientId: 'b',
      status: 'failed',
      error: 'SOCKET_LOST|gone',
    });
    expect(overlay.typing).toBe(false);
  });

  test('without typed turns the thread is the synced rows untouched', () => {
    const messages = [spoken];
    expect(chatOverlay({ messages, entries: [], leg: 'phone', skewMs: SKEW }).rows).toBe(messages);
  });
});

describe('the words of a failed typed turn', () => {
  const t = ((key: string) => key) as Parameters<typeof chatErrorMessage>[1];

  test('the client codes name what happened', () => {
    expect(chatErrorMessage('SOCKET_LOST|gone', t)).toBe(
      'screens.conversations.chat.errors.connection'
    );
    expect(chatErrorMessage('CALL_ACTIVE|live', t)).toBe(
      'screens.conversations.chat.errors.call-active'
    );
    expect(chatErrorMessage('CHAT_INTERRUPTED|x', t)).toBe(
      'screens.conversations.chat.errors.interrupted'
    );
    expect(chatErrorMessage('CHAT_TIMEOUT|x', t)).toBe('screens.conversations.chat.errors.timeout');
  });

  test('a server sentence without a code reads as a generic refusal', () => {
    expect(chatErrorCode('Voice is unavailable')).toBe('');
    expect(chatErrorMessage('Voice is unavailable', t)).toBe(
      'screens.conversations.chat.errors.generic'
    );
    expect(chatErrorMessage(null, t)).toBe('screens.conversations.chat.errors.generic');
  });
});
