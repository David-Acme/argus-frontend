import { describe, expect, test } from 'bun:test';
import type { IConversationMessageCacheRow } from '@/core/interfaces';
import {
  chatStatusOf,
  deliveryReportsOf,
  newestIncomingServerId,
  rowStatusOf,
} from '@/features/conversations/model/receipts';

const row = (patch: Partial<IConversationMessageCacheRow>): IConversationMessageCacheRow => ({
  id: '10',
  counterpartId: 3,
  counterpartName: 'Ana',
  direction: 'out',
  kind: 'relay',
  body: 'Ven',
  leg: null,
  state: 'sent',
  messageKey: 'k',
  replyToKey: null,
  result: null,
  via: null,
  receipt: null,
  voiceNote: null,
  isRead: true,
  createdAt: 1,
  ...patch,
});

describe('the ticks of my bubbles', () => {
  test('a member message shows ✓ sent, ✓✓ delivered and blue ✓✓ read from its receipt', () => {
    expect(rowStatusOf(row({ receipt: 'sent' }))).toBe('sent');
    expect(rowStatusOf(row({ receipt: 'delivered' }))).toBe('delivered');
    expect(rowStatusOf(row({ receipt: 'read' }))).toBe('read');
  });

  test('a pending line shows the clock, and nothing marks an incoming line or a visitor', () => {
    expect(rowStatusOf(row({ id: 'pending-1' }))).toBe('sending');
    expect(rowStatusOf(row({ direction: 'in' }))).toBeNull();
    expect(rowStatusOf(row({ kind: 'visitor' }))).toBeNull();
  });

  test('an older row without a receipt reads from its relay state, and a turn Argus stored is answered', () => {
    expect(rowStatusOf(row({ state: 'notified' }))).toBe('delivered');
    expect(rowStatusOf(row({ state: 'expired' }))).toBe('sent');
    expect(rowStatusOf(row({ kind: 'turn', counterpartId: 0 }))).toBe('read');
  });

  test('a typed turn to Argus: clock, ✓✓ on the first typing frame, blue ✓✓ when done, resend when it failed', () => {
    expect(chatStatusOf({ status: 'sending', typed: false })).toBe('sending');
    expect(chatStatusOf({ status: 'waiting', typed: false })).toBe('sending');
    expect(chatStatusOf({ status: 'waiting', typed: true })).toBe('delivered');
    expect(chatStatusOf({ status: 'done', typed: true })).toBe('read');
    expect(chatStatusOf({ status: 'failed', typed: true })).toBe('failed');
  });
});

describe('what the app reports', () => {
  test('delivered once per member thread whose newest line is theirs, up to that id', () => {
    const summaries = [
      { counterpartId: 0, last: row({ id: '50', direction: 'in' }) },
      { counterpartId: 3, last: row({ id: '41', direction: 'in' }) },
      { counterpartId: 5, last: row({ id: '42', direction: 'out' }) },
      { counterpartId: 6, last: row({ id: 'pending-3', direction: 'in' }) },
    ];
    expect(deliveryReportsOf(summaries, new Map())).toEqual([{ counterpartId: 3, upToId: 41 }]);
    expect(deliveryReportsOf(summaries, new Map([[3, 41]]))).toEqual([]);
  });

  test('read names the newest incoming id the thread shows', () => {
    expect(
      newestIncomingServerId([
        row({ id: '9', direction: 'in' }),
        row({ id: '12', direction: 'in' }),
        row({ id: '13' }),
      ])
    ).toBe(12);
    expect(newestIncomingServerId([row({ id: '13' })])).toBeNull();
  });
});
