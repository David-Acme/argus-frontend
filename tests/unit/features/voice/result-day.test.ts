import { describe, expect, test } from 'bun:test';
import { countWordOf, resultDayOf } from '@/features/voice/model/result-day';

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (at: number) => Math.floor(at / DAY) * DAY;

const NOW = 10 * DAY + 5_000;

describe('the day a result talks about', () => {
  test('today, tomorrow and yesterday by calendar day, anything else by its date', () => {
    expect(resultDayOf({ at: NOW + 60_000, now: NOW, startOfDay })).toBe('today');
    expect(resultDayOf({ at: 11 * DAY + 1, now: NOW, startOfDay })).toBe('tomorrow');
    expect(resultDayOf({ at: 9 * DAY + 1, now: NOW, startOfDay })).toBe('yesterday');
    expect(resultDayOf({ at: 14 * DAY, now: NOW, startOfDay })).toBe('other');
  });

  test('a count reads as nothing, one or many', () => {
    expect(countWordOf(0)).toBe('none');
    expect(countWordOf(1)).toBe('one');
    expect(countWordOf(3)).toBe('many');
  });
});
