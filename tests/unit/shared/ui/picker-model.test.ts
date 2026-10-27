import { describe, expect, test } from 'bun:test';
import {
  clampDay,
  gridKey,
  dayLook,
  monthGrid,
  moveToMonth,
  quickDays,
  shiftMonth,
  weekdayOrder,
} from '@/shared/ui/picker/model/calendar';
import {
  fromWheels,
  hourSteps,
  minuteSteps,
  nearestSlot,
  snapMinutes,
  timeSlots,
  toWheels,
} from '@/shared/ui/picker/model/clock';
import { pickerForm } from '@/shared/ui/picker/model/form';
import {
  dateOrderOf,
  dayOfParts,
  partsOfDay,
  partsOfTime,
  segmentSpec,
  stepValue,
  timeOfParts,
  typeDigit,
} from '@/shared/ui/picker/model/segments';
import { settleIndex, typeAhead, wheelKey } from '@/shared/ui/picker/model/wheel';

const day = (year: number, month: number, date: number) => new Date(year, month, date).getTime();

describe('picker calendar', () => {
  test('the grid starts on the locale week start and holds only the weeks the month needs', () => {
    const monday = monthGrid({ year: 2026, month: 9 }, 1);
    expect(monday).toHaveLength(35);
    expect(new Date(monday[0]?.at ?? 0).getDay()).toBe(1);
    expect(monday[0]?.inMonth).toBe(false);
    expect(monday.filter((cell) => cell.inMonth)).toHaveLength(31);
    const sunday = monthGrid({ year: 2026, month: 1 }, 0);
    expect(sunday).toHaveLength(28);
    expect(sunday[0]?.at).toBe(day(2026, 1, 1));
  });

  test('the weekday initials follow the week start', () => {
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  test('months shift across years and a day clamps to the shorter month', () => {
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(clampDay({ year: 2026, month: 1 }, 31)).toBe(day(2026, 1, 28));
    expect(moveToMonth(day(2024, 0, 31), { year: 2024, month: 1 })).toBe(day(2024, 1, 29));
  });

  test('today, the selected day and the forbidden past are told apart', () => {
    const today = day(2026, 9, 27);
    expect(dayLook(today, { today, selected: today + 3_600_000, min: null })).toEqual({
      today: true,
      selected: true,
      disabled: false,
    });
    expect(dayLook(day(2026, 9, 26), { today, selected: null, min: today }).disabled).toBe(true);
  });

  test('the quick days are today, tomorrow and the coming Saturday, or today at the weekend', () => {
    const tuesday = day(2026, 9, 27) + 10 * 3_600_000;
    expect(quickDays(tuesday)).toEqual({
      today: day(2026, 9, 27),
      tomorrow: day(2026, 9, 28),
      weekend: day(2026, 9, 31),
    });
    expect(quickDays(day(2026, 10, 1)).weekend).toBe(day(2026, 10, 1));
  });
});

describe('picker clock', () => {
  test('a 12 h clock shows 12 to 11 and keeps the afternoon apart; 24 h shows 0 to 23', () => {
    expect(hourSteps(true)).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(hourSteps(false)).toHaveLength(24);
    expect(toWheels(0, true)).toEqual({ hour: 12, minute: 0, afternoon: false });
    expect(toWheels(13 * 60 + 30, true)).toEqual({ hour: 1, minute: 30, afternoon: true });
    expect(fromWheels({ hour: 12, minute: 0, afternoon: true }, true)).toBe(12 * 60);
    expect(fromWheels({ hour: 12, minute: 15, afternoon: false }, true)).toBe(15);
    expect(fromWheels({ hour: 18, minute: 5, afternoon: true }, false)).toBe(18 * 60 + 5);
  });

  test('minutes step by five unless the field needs one, and a time snaps to its step', () => {
    expect(minuteSteps(5)).toHaveLength(12);
    expect(minuteSteps(1)).toHaveLength(60);
    expect(snapMinutes(10 * 60 + 7, 5)).toBe(10 * 60 + 5);
    expect(snapMinutes(23 * 60 + 58, 5)).toBe(0);
  });
});

describe('picker wheel', () => {
  test('arrows step, pages jump five, Home and End reach the ends, all clamped', () => {
    expect(wheelKey(3, 'ArrowDown', 12)).toBe(4);
    expect(wheelKey(0, 'ArrowUp', 12)).toBe(0);
    expect(wheelKey(10, 'PageDown', 12)).toBe(11);
    expect(wheelKey(4, 'Home', 12)).toBe(0);
    expect(wheelKey(4, 'End', 12)).toBe(11);
    expect(wheelKey(4, 'toString', 12)).toBeNull();
  });

  test('a fling settles on the row its momentum reaches', () => {
    expect(settleIndex({ offset: 70, velocity: 0, row: 36, count: 12 })).toBe(2);
    expect(settleIndex({ offset: 70, velocity: 1000, row: 36, count: 12 })).toBe(5);
    expect(settleIndex({ offset: 70, velocity: 10_000, row: 36, count: 12 })).toBe(11);
  });

  test('typing digits finds the value, ignoring a leading zero', () => {
    const minutes = ['00', '05', '10', '15', '30'];
    expect(typeAhead('', '1', minutes)).toEqual({ buffer: '1', index: 2 });
    expect(typeAhead('1', '5', minutes)).toEqual({ buffer: '15', index: 3 });
    expect(typeAhead('15', '3', minutes)).toEqual({ buffer: '3', index: 4 });
    expect(typeAhead('', '5', minutes)).toEqual({ buffer: '5', index: 1 });
    expect(typeAhead('', 'x', minutes)).toEqual({ buffer: '', index: null });
  });
});

describe('picker form', () => {
  test('a fine pointer always types; touch is inline on a phone and a popover wider up', () => {
    expect(pickerForm({ navigation: 'bar', finePointer: true })).toBe('desktop');
    expect(pickerForm({ navigation: 'sidebar', finePointer: true })).toBe('desktop');
    expect(pickerForm({ navigation: 'bar', finePointer: false })).toBe('inline');
    expect(pickerForm({ navigation: 'rail', finePointer: false })).toBe('popover');
  });
});

describe('picker segments', () => {
  test('the locale decides the order of day, month and year', () => {
    expect(dateOrderOf('22/11/2033')).toEqual(['day', 'month', 'year']);
    expect(dateOrderOf('11/22/2033')).toEqual(['month', 'day', 'year']);
    expect(dateOrderOf('2033-11-22')).toEqual(['year', 'month', 'day']);
  });

  test('typing fills a segment and moves on once no other digit fits', () => {
    const day = segmentSpec('day', false);
    expect(typeDigit('', '4', day)).toEqual({ text: '4', done: true });
    expect(typeDigit('', '2', day)).toEqual({ text: '2', done: false });
    expect(typeDigit('2', '7', day)).toEqual({ text: '27', done: true });
    expect(typeDigit('', '1', segmentSpec('month', false))).toEqual({ text: '1', done: false });
    expect(typeDigit('202', '6', segmentSpec('year', false))).toEqual({ text: '2026', done: true });
  });

  test('the arrows wrap inside the segment range and start from an end when empty', () => {
    const month = segmentSpec('month', false);
    expect(stepValue(12, 1, month)).toBe(1);
    expect(stepValue(1, -1, month)).toBe(12);
    expect(stepValue(null, 1, month)).toBe(1);
    expect(stepValue(null, -1, segmentSpec('hour', false))).toBe(23);
  });

  test('a date commits only when it exists', () => {
    expect(dayOfParts({ day: 27, month: 10, year: 2026 })).toBe(day(2026, 9, 27));
    expect(dayOfParts({ day: 31, month: 2, year: 2026 })).toBeNull();
    expect(dayOfParts({ day: 1, month: null, year: 2026 })).toBeNull();
    expect(partsOfDay(day(2026, 9, 27))).toEqual({ day: 27, month: 10, year: 2026 });
  });

  test('a time commits in 24 h or with its AM and PM', () => {
    expect(timeOfParts({ hour: 18, minute: 5, period: null }, false)).toBe(18 * 60 + 5);
    expect(timeOfParts({ hour: 12, minute: 0, period: 0 }, true)).toBe(0);
    expect(timeOfParts({ hour: 9, minute: 30, period: 1 }, true)).toBe(21 * 60 + 30);
    expect(timeOfParts({ hour: 9, minute: 30, period: null }, true)).toBeNull();
    expect(partsOfTime(21 * 60 + 30, true)).toEqual({ hour: 9, minute: 30, period: 1 });
  });
});

describe('picker keyboard grid', () => {
  test('arrows move days and weeks, pages move months clamped, Home and End reach the week edges', () => {
    const tuesday = day(2026, 9, 27);
    expect(gridKey(tuesday, 'ArrowRight', 1)).toBe(day(2026, 9, 28));
    expect(gridKey(tuesday, 'ArrowUp', 1)).toBe(day(2026, 9, 20));
    expect(gridKey(day(2026, 0, 31), 'PageDown', 1)).toBe(day(2026, 1, 28));
    expect(gridKey(tuesday, 'Home', 1)).toBe(day(2026, 9, 26));
    expect(gridKey(tuesday, 'End', 1)).toBe(day(2026, 10, 1));
    expect(gridKey(tuesday, 'Home', 0)).toBe(day(2026, 9, 25));
    expect(gridKey(tuesday, 'toString', 1)).toBeNull();
  });

  test('the time list has a slot every step and finds the nearest one', () => {
    expect(timeSlots(15)).toHaveLength(96);
    expect(timeSlots(30)[1]).toBe(30);
    expect(nearestSlot(10 * 60 + 5, 15)).toBe(40);
    expect(nearestSlot(10 * 60 + 8, 15)).toBe(41);
  });
});
