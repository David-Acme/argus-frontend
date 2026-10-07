import { describe, expect, test } from 'bun:test';
import {
  crossesMidnight,
  formatHours,
  HALF_HOURS,
  parseHours,
  summarizeHours,
  validHours,
} from '@/features/security/model/hours';

const LABELS = {
  day: (day: number) => ['D', 'L', 'M', 'X', 'J', 'V', 'S'][day] ?? '?',
  everyDay: 'Todos',
};

describe('guard hours', () => {
  test('parses the backend window syntax, days optional', () => {
    expect(parseHours('mon-fri 08:00-19:00')).toEqual([{ days: [1, 2, 3, 4, 5], start: '08:00', end: '19:00' }]);
    expect(parseHours('22:00-06:00')).toEqual([{ days: [], start: '22:00', end: '06:00' }]);
    expect(parseHours('fri-mon 20:00-24:00')).toEqual([{ days: [5, 6, 0, 1], start: '20:00', end: '24:00' }]);
  });

  test('windows with the same times merge their days back', () => {
    expect(parseHours('mon 09:00-14:00, wed 09:00-14:00, fri 09:00-14:00')).toEqual([
      { days: [1, 3, 5], start: '09:00', end: '14:00' },
    ]);
    expect(parseHours('sun-sat 10:00-11:00')).toEqual([{ days: [], start: '10:00', end: '11:00' }]);
  });

  test('formats day runs the backend parser accepts', () => {
    const spec = formatHours([
      { days: [1, 2, 3, 5], start: '08:00', end: '18:00' },
      { days: [], start: '22:00', end: '07:00' },
    ]);
    expect(spec).toBe('mon-wed 08:00-18:00, fri 08:00-18:00, 22:00-07:00');
    expect(validHours(spec)).toBe(true);
    expect(parseHours(spec)).toEqual([
      { days: [1, 2, 3, 5], start: '08:00', end: '18:00' },
      { days: [], start: '22:00', end: '07:00' },
    ]);
  });

  test('a full week runs across sunday', () => {
    expect(formatHours([{ days: [6, 0], start: '10:00', end: '14:00' }])).toBe('sat-sun 10:00-14:00');
  });

  test('rejects what the backend would refuse', () => {
    expect(validHours('mon-fri 8-18')).toBe(false);
    expect(validHours('mon-fri 08:00-08:00')).toBe(false);
    expect(validHours('')).toBe(true);
  });

  test('summaries read like a calendar', () => {
    expect(summarizeHours(parseHours('mon-fri 08:00-19:00, sat 10:00-14:00'), LABELS)).toBe(
      'L–V 08:00–19:00 · S 10:00–14:00'
    );
    expect(summarizeHours(parseHours('23:00-07:00'), LABELS)).toBe('Todos 23:00–07:00');
  });

  test('half hours cover the day and the end of day', () => {
    expect(HALF_HOURS[0]).toBe('00:00');
    expect(HALF_HOURS.at(-1)).toBe('24:00');
    expect(HALF_HOURS).toHaveLength(49);
    expect(crossesMidnight({ days: [], start: '22:00', end: '06:00' })).toBe(true);
    expect(crossesMidnight({ days: [], start: '08:00', end: '18:00' })).toBe(false);
  });
});
