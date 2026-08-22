import { describe, expect, test } from 'bun:test';
import { createDateFormatter } from '../src/shared/libs/date';

const at = new Date(2026, 7, 26, 13, 5);

describe('date tools', () => {
  test('uses the device clock and first weekday over the app language defaults', () => {
    const formatter = createDateFormatter('en', {
      languageTag: 'en-GB',
      regionCode: 'GB',
      uses24hourClock: true,
      firstWeekday: 1,
      timeZone: 'Europe/London',
    });

    expect(formatter.formatTime(at)).toBe('13:05');
    expect(formatter.formatMonth(at)).toBe('August');
    expect(formatter.weekDays(at)[0].getDay()).toBe(0);

    const range = formatter.rangeFor('week', at);
    expect(new Date(range.from).getDay()).toBe(0);
    expect(new Date(range.to).getDay()).toBe(6);
  });

  test('formats Spanish names and falls back safely when device calendar data is unavailable', () => {
    const formatter = createDateFormatter('es', {
      languageTag: 'es-PE',
      regionCode: 'PE',
      uses24hourClock: null,
      firstWeekday: null,
      timeZone: null,
    });

    expect(formatter.formatMonth(at)).toBe('agosto');
    expect(formatter.formatTime(at)).toBe('13:05');
    expect(formatter.weekDays(at)[0].getDay()).toBe(1);
  });

  test('uses AM/PM when the device opts into a twelve-hour clock', () => {
    const formatter = createDateFormatter('en', {
      languageTag: 'en-US',
      regionCode: 'US',
      uses24hourClock: false,
      firstWeekday: 1,
      timeZone: 'America/New_York',
    });

    expect(formatter.formatTime(at)).toBe('1:05 PM');
    expect(formatter.formatHour(13)).toBe('1:00 PM');
    expect(formatter.defaultInputTime(at, new Date(2026, 7, 26, 13, 5))).toBe('14:00');
  });
});
