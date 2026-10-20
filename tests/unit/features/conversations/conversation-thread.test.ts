import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
import {
  counterpartNameOf,
  DELIVERY_STATE_KEYS,
  isArgus,
  LEG_KEYS,
  previewOf,
} from '@/features/conversations/model/conversation-labels';
import {
  CONVERSATION_MESSAGE_LENSES,
  conversationClearIntents,
  conversationLenses,
  conversationReadIntents,
  typedMessageIntent,
} from '@/features/conversations/model/conversation-optimistic';
import { applyIntents, type OptimisticIntent } from '@/shared/libs/optimistic';
import {
  dayKindOf,
  deliveryStateOf,
  legOf,
  quoted,
  repliedBodyOf,
  replyBodies,
  unreadIncomingIds,
} from '@/features/conversations/model/conversation-thread';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 19, 9, 0, 0);

const message = (patch: Partial<IConversationMessageCacheRow> & { id: string }): IConversationMessageCacheRow => ({
  counterpartId: 3,
  counterpartName: 'David',
  direction: 'out',
  kind: 'relay',
  body: 'Ven a comer',
  leg: null,
  state: 'sent',
  messageKey: `key-${patch.id}`,
  replyToKey: null,
  isRead: true,
  createdAt: T0,
  ...patch,
});

const t = ((key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as unknown as TranslateFn;

describe('deliveryStateOf', () => {
  test('an outgoing relay or reply shows its delivery state', () => {
    for (const state of ['sent', 'delivered', 'notified', 'answered', 'expired'] as const) {
      expect(deliveryStateOf(message({ id: '1', state }))).toBe(state);
      expect(deliveryStateOf(message({ id: '1', kind: 'reply', state }))).toBe(state);
    }
  });

  test('an incoming copy, a turn or a visitor notice shows none', () => {
    expect(deliveryStateOf(message({ id: '1', direction: 'in', state: 'received' }))).toBeNull();
    expect(deliveryStateOf(message({ id: '1', direction: 'in', state: 'delivered' }))).toBeNull();
    expect(deliveryStateOf(message({ id: '1', kind: 'turn', state: 'delivered' }))).toBeNull();
    expect(deliveryStateOf(message({ id: '1', kind: 'visitor', direction: 'in', state: 'received' }))).toBeNull();
  });

  test('an outgoing message still marked received shows nothing rather than a guess', () => {
    expect(deliveryStateOf(message({ id: '1', state: 'received' }))).toBeNull();
  });

  test('every delivery state has its label', () => {
    expect(DELIVERY_STATE_KEYS).toEqual({
      sent: 'screens.conversations.state.sent',
      delivered: 'screens.conversations.state.delivered',
      notified: 'screens.conversations.state.notified',
      answered: 'screens.conversations.state.answered',
      expired: 'screens.conversations.state.expired',
    });
  });
});

describe('legOf', () => {
  test('only a turn shows where it was said', () => {
    expect(legOf(message({ id: '1', kind: 'turn', leg: 'camera' }))).toBe('camera');
    expect(legOf(message({ id: '1', kind: 'turn', leg: null }))).toBeNull();
    expect(legOf(message({ id: '1', kind: 'relay', leg: 'phone' }))).toBeNull();
    expect(LEG_KEYS.laptop).toBe('screens.conversations.leg.laptop');
  });
});

describe('dayKindOf', () => {
  test('names today and yesterday, dates the rest', () => {
    expect(dayKindOf(10 * DAY, 10 * DAY, 9 * DAY)).toBe('today');
    expect(dayKindOf(9 * DAY, 10 * DAY, 9 * DAY)).toBe('yesterday');
    expect(dayKindOf(3 * DAY, 10 * DAY, 9 * DAY)).toBe('date');
  });
});

describe('replies', () => {
  test('a reply quotes the message it answers when the thread still holds it', () => {
    const thread = [
      message({ id: '1', messageKey: 'msg-1', body: 'Ven a comer' }),
      message({ id: '2', direction: 'in', kind: 'reply', replyToKey: 'msg-1', body: 'Voy', state: 'received' }),
      message({ id: '3', direction: 'in', kind: 'reply', replyToKey: 'msg-gone', body: '¿Qué?', state: 'received' }),
    ];
    const bodies = replyBodies(thread);
    expect(repliedBodyOf(thread[1]!, bodies)).toBe('Ven a comer');
    expect(repliedBodyOf(thread[2]!, bodies)).toBeNull();
    expect(repliedBodyOf(thread[0]!, bodies)).toBeNull();
  });

  test('a long quote is cut on one line', () => {
    expect(quoted('  uno\n dos  ')).toBe('uno dos');
    expect(quoted('abcdefghij', 5)).toBe('abcd…');
  });
});

describe('unreadIncomingIds', () => {
  test('only incoming rows not yet read', () => {
    expect(
      unreadIncomingIds([
        message({ id: '1', direction: 'in', isRead: false }),
        message({ id: '2', direction: 'in', isRead: true }),
        message({ id: '3', direction: 'out', isRead: false }),
      ])
    ).toEqual(['1']);
  });
});

describe('labels', () => {
  test('Argus is counterpart 0 and is named Argus whatever the row says', () => {
    expect(isArgus(0)).toBe(true);
    expect(isArgus(3)).toBe(false);
    expect(counterpartNameOf(0, 'Something', t)).toBe('screens.conversations.argus');
  });

  test('a member keeps the name of the row, and a blank one reads as someone at home', () => {
    expect(counterpartNameOf(3, ' David ', t)).toBe('David');
    expect(counterpartNameOf(3, '  ', t)).toBe('screens.conversations.someone-home');
  });

  test('the preview of an outgoing line says it was the viewer', () => {
    expect(previewOf(message({ id: '1', body: 'Ven\na comer' }), t)).toBe('screens.conversations.you:{"body":"Ven a comer"}');
    expect(previewOf(message({ id: '1', direction: 'in', body: 'Voy' }), t)).toBe('Voy');
    expect(previewOf(message({ id: '1', direction: 'in', kind: 'visitor', body: '' }), t)).toBe(
      'screens.conversations.visitor'
    );
  });
});

describe('optimistic read and clear', () => {
  test('reading marks each unread row as read', () => {
    expect(conversationReadIntents(['4', '5'])).toEqual([
      { table: 'conversation_message', kind: 'update', recordId: '4', values: { isRead: true } },
      { table: 'conversation_message', kind: 'update', recordId: '5', values: { isRead: true } },
    ]);
  });

  test('clearing removes every row of the thread', () => {
    expect(conversationClearIntents([{ id: '4' }, { id: '5' }])).toEqual([
      { table: 'conversation_message', kind: 'delete', recordId: '4' },
      { table: 'conversation_message', kind: 'delete', recordId: '5' },
    ]);
  });

  test('the lens patches the read flag of the row it names', () => {
    const [lens] = CONVERSATION_MESSAGE_LENSES;
    const row = message({ id: '9', direction: 'in', isRead: false });
    expect(lens?.recordIdOf(row)).toBe('9');
    expect(lens?.patch(row, { isRead: true }).isRead).toBe(true);
    expect(lens?.patch(row, {}).isRead).toBe(false);
  });
});

describe('a typed message shows at once and gives way to the synced row', () => {
  const draft = { counterpartId: 3, counterpartName: 'David', body: '¿Vienes a comer?', createdAt: T0 };
  const intentOf = (recordId: string, confirmed: boolean): OptimisticIntent => ({
    id: 'intent-1',
    ...typedMessageIntent(draft),
    recordId,
    values: draft,
    confirmed,
  });

  test('the intent is a create on the conversation table carrying the words', () => {
    expect(typedMessageIntent(draft)).toEqual({ table: 'conversation_message', kind: 'create', values: draft });
  });

  test('the pending row is the sender copy, still sent, at the end of its own thread only', () => {
    const synced = [message({ id: '1', direction: 'in', createdAt: T0 - 1000 })];
    const shown = applyIntents(synced, [intentOf('pending-1', false)], conversationLenses(3));
    expect(shown).toHaveLength(2);
    expect(shown[1]).toMatchObject({
      id: 'pending-1',
      counterpartId: 3,
      direction: 'out',
      kind: 'relay',
      state: 'sent',
      body: '¿Vienes a comer?',
      isRead: true,
    });
    expect(applyIntents(synced, [intentOf('pending-1', false)], conversationLenses(5))).toBe(synced);
    expect(applyIntents(synced, [intentOf('pending-1', false)], CONVERSATION_MESSAGE_LENSES)).toBe(synced);
  });

  test('once the server row with that id is synced, it is shown once', () => {
    const synced = [message({ id: '42', direction: 'out', kind: 'relay', state: 'notified', counterpartId: 3, body: '¿Vienes a comer?' })];
    const shown = applyIntents(synced, [intentOf('42', true)], conversationLenses(3));
    expect(shown.filter((row) => row.id === '42')).toHaveLength(1);
    expect(shown[0]?.state).toBe('notified');
  });
});
