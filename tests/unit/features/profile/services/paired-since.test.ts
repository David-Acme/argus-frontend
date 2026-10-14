import { describe, expect, test } from 'bun:test';
import { pairedSinceLabel } from '@/features/profile/services/paired-since';

describe('pairedSinceLabel', () => {
  test('an instance paired before the stamp existed shows no date', () => {
    expect(pairedSinceLabel(0, 'es')).toBeNull();
  });

  test('the epoch-adjacent fixture stamp of 1 ms shows no date', () => {
    expect(pairedSinceLabel(1, 'es')).toBeNull();
  });

  test('a negative, non-finite or out-of-range stamp shows no date', () => {
    for (const stamp of [-5, Number.NaN, Number.POSITIVE_INFINITY, 8.7e15]) {
      expect(pairedSinceLabel(stamp, 'es')).toBeNull();
    }
  });

  test('a real pairing date is shown in the language of the screen', () => {
    const label = pairedSinceLabel(Date.UTC(2026, 9, 14, 12), 'es');
    expect(label).not.toBeNull();
    expect(label).toContain('2026');
  });
});
