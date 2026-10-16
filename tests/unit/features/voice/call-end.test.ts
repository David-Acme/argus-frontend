import { describe, expect, test } from 'bun:test';
import { callEndAction, ENDED_HOLD_MS, formatCallDuration } from '@/features/voice/model/call-end';

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

  test('the duration reads minutes and seconds', () => {
    expect(formatCallDuration(0)).toBe('00:00');
    expect(formatCallDuration(9_999)).toBe('00:09');
    expect(formatCallDuration(65_000)).toBe('01:05');
    expect(formatCallDuration(-5)).toBe('00:00');
  });
});
