import { describe, expect, test } from 'bun:test';
import { calendarMonthRange } from '@/core/services/view-cache/calendar.projection';
import { createDateFormatter, type DeviceDatePreferences } from '@/shared/hooks/use-date-formatter/date';

const spain: DeviceDatePreferences = {
  languageTag: 'es-ES',
  regionCode: 'ES',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: 'Europe/Madrid',
};

const us: DeviceDatePreferences = {
  languageTag: 'en-US',
  regionCode: 'US',
  uses24hourClock: false,
  firstWeekday: 1,
  timeZone: 'America/New_York',
};

const october = new Date(2026, 9, 15, 10, 30);

describe('createDateFormatter', () => {
  test('weeks start on the device first weekday', () => {
    expect(createDateFormatter('es', spain).weekDays(october)[0]?.getDay()).toBe(1);
    expect(createDateFormatter('en', us).weekDays(october)[0]?.getDay()).toBe(0);
  });

  test('times follow the clock preference', () => {
    const start = new Date(2026, 9, 15, 14, 5);
    const end = new Date(2026, 9, 15, 15, 0);
    expect(createDateFormatter('es', spain).formatTimeRange(start, end)).toBe('14:05 – 15:00');
    expect(createDateFormatter('en', us).formatTime(start)).toBe('2:05 PM');
  });

  test('the default input time is 09:00 on other days and the next hour today', () => {
    const date = createDateFormatter('es', spain);
    expect(date.defaultInputTime(new Date(2026, 9, 16), october)).toBe('09:00');
    expect(date.defaultInputTime(october, october)).toBe('11:00');
    expect(date.atInputTime(october, '07:45')).toEqual(new Date(2026, 9, 15, 7, 45));
  });

  test('the calendar cache window covers the visible month grid for any week start', () => {
    for (const preferences of [spain, us]) {
      const date = createDateFormatter('es', preferences);
      for (let month = 0; month < 12; month += 1) {
        const anchor = new Date(2026, month, 10);
        const window = calendarMonthRange(anchor);
        const grid = date.monthGridDays(anchor);
        expect(grid[0]?.getTime() ?? 0).toBeGreaterThanOrEqual(window.from);
        expect(date.endOfDay(grid.at(-1)!).getTime()).toBeLessThanOrEqual(window.to);
      }
    }
  });
});
