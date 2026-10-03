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
    expect(createDateFormatter('es', spain).weekDays(october)[0].getDay()).toBe(1);
    expect(createDateFormatter('en', us).weekDays(october)[0].getDay()).toBe(0);
  });

  test('ranges cover whole days of the view', () => {
    const date = createDateFormatter('es', spain);
    const day = date.rangeFor('day', october);
    expect(new Date(day.from)).toEqual(new Date(2026, 9, 15));
    expect(day.to - day.from).toBe(86_400_000 - 1);
    const week = date.rangeFor('week', october);
    expect(new Date(week.from)).toEqual(new Date(2026, 9, 12));
    const month = date.rangeFor('month', october);
    expect(date.monthGridDays(october)).toHaveLength(42);
    expect(new Date(month.from)).toEqual(new Date(2026, 8, 28));
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

  test('the timeline widens to include early and late entries', () => {
    const date = createDateFormatter('es', spain);
    const hours = date.timelineHours([5, 23]);
    expect(hours[0]).toBe(5);
    expect(hours.at(-1)).toBe(23);
  });

  test('the calendar cache window covers the visible month grid for any week start', () => {
    for (const preferences of [spain, us]) {
      const date = createDateFormatter('es', preferences);
      for (let month = 0; month < 12; month += 1) {
        const anchor = new Date(2026, month, 10);
        const window = calendarMonthRange(anchor);
        const grid = date.monthGridDays(anchor);
        expect(grid[0].getTime()).toBeGreaterThanOrEqual(window.from);
        expect(date.endOfDay(grid.at(-1)!).getTime()).toBeLessThanOrEqual(window.to);
      }
    }
  });
});
