import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import {
  addDays,
  calendarDaysBetween,
  DAY_MS,
  endOfDay,
  startOfDay,
  startOfNextDay,
} from '@/core/services/view-cache/dates';

const HOUR_MS = 3_600_000;
const zone = process.env.TZ;

beforeAll(() => {
  process.env.TZ = 'Europe/Madrid';
});

afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

describe('calendar days across daylight saving changes', () => {
  test('the autumn change has a 25-hour day and the next midnight is real', () => {
    const fallBack = new Date(2026, 9, 25, 12);
    expect(startOfNextDay(fallBack) - startOfDay(fallBack)).toBe(DAY_MS + HOUR_MS);
    expect(endOfDay(fallBack)).toBe(startOfNextDay(fallBack) - 1);
    expect(new Date(startOfNextDay(new Date(2026, 9, 25, 23, 30))).getDate()).toBe(26);
  });

  test('the spring change has a 23-hour day', () => {
    const springForward = new Date(2026, 2, 29, 12);
    expect(startOfNextDay(springForward) - startOfDay(springForward)).toBe(DAY_MS - HOUR_MS);
  });

  test('calendar distance ignores the hour the clocks moved', () => {
    expect(calendarDaysBetween(new Date(2026, 2, 30, 0, 30), new Date(2026, 2, 28, 23, 30))).toBe(2);
    expect(calendarDaysBetween(new Date(2026, 9, 26, 0, 10), new Date(2026, 9, 24, 23, 50))).toBe(2);
    expect(addDays(new Date(2026, 9, 25, 15), -6).getDate()).toBe(19);
  });
});
