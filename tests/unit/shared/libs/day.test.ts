import { describe, expect, test } from 'bun:test';
import { DAY_MS, nowSeconds, startOfLocalDay } from '@/shared/libs/day';

describe('day', () => {
  test('the start of a local day is its local midnight', () => {
    const at = new Date(2026, 9, 27, 15, 42, 7, 300).getTime();
    expect(startOfLocalDay(at)).toBe(new Date(2026, 9, 27).getTime());
    expect(startOfLocalDay(startOfLocalDay(at))).toBe(startOfLocalDay(at));
    expect(startOfLocalDay(at + DAY_MS) - startOfLocalDay(at)).toBeGreaterThan(0);
  });

  test('now in seconds is the whole second of the clock', () => {
    const before = Math.floor(Date.now() / 1000);
    const now = nowSeconds();
    expect(Number.isInteger(now)).toBe(true);
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });
});
