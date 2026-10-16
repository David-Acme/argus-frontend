import { describe, expect, test } from 'bun:test';
import {
  callEndAction,
  dispatchCallEnd,
  ENDED_HOLD_MS,
  endReasonOfCancel,
  formatCallDuration,
} from '@/features/voice/model/call-end';

describe('how a call ends on the screen', () => {
  test('an answered call that ends, on either side, shows the ended state first', () => {
    expect(callEndAction('answered-ended')).toBe('show-ended');
  });

  test('a missed, declined or claimed-elsewhere ring closes at once', () => {
    expect(callEndAction('missed')).toBe('close-now');
    expect(callEndAction('declined')).toBe('close-now');
    expect(callEndAction('claimed-elsewhere')).toBe('close-now');
  });

  test('the ended state holds for two seconds', () => {
    expect(ENDED_HOLD_MS).toBe(2000);
  });

  test('the server cancel reasons map to the same end reasons the screen uses', () => {
    expect(endReasonOfCancel('answered_elsewhere')).toBe('claimed-elsewhere');
    expect(endReasonOfCancel('declined')).toBe('declined');
    expect(endReasonOfCancel('expired')).toBe('missed');
    expect(endReasonOfCancel('resolved')).toBe('missed');
    expect(endReasonOfCancel('attended')).toBe('missed');
  });

  test('the dispatcher runs the ended state only for an answered call', () => {
    const order: string[] = [];
    const handlers = { showEnded: () => order.push('ended'), closeNow: () => order.push('close') };
    dispatchCallEnd('answered-ended', handlers);
    dispatchCallEnd('claimed-elsewhere', handlers);
    dispatchCallEnd('missed', handlers);
    expect(order).toEqual(['ended', 'close', 'close']);
  });

  test('the duration reads minutes and seconds', () => {
    expect(formatCallDuration(0)).toBe('00:00');
    expect(formatCallDuration(9_999)).toBe('00:09');
    expect(formatCallDuration(65_000)).toBe('01:05');
    expect(formatCallDuration(-5)).toBe('00:00');
  });
});
