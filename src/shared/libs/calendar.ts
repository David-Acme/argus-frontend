import { DAYS_PER_WEEK, MONTH_GRID_ROWS, TIMELINE_HOURS } from '@/shared/constants';

/** Midnight of the given day, local time. */
export function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return new Date(value.getTime() - 1);
}

/** Monday-first, matching the strip and the month grid. */
export function startOfWeek(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return value;
}

export function startOfMonth(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(1);
  return value;
}

export function addDays(date: Date, amount: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

export function addMonths(date: Date, amount: number): Date {
  const value = startOfMonth(date);
  value.setMonth(value.getMonth() + amount);
  return value;
}

export function sameDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

/** Seven consecutive days from the Monday of `date`. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date);
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDays(monday, index));
}

/**
 * Always 6 x 7 cells starting on the Monday on or before the 1st, so the grid
 * has the same height every month and nothing jumps when you page.
 */
export function monthGridDays(date: Date): Date[] {
  const first = startOfWeek(startOfMonth(date));
  return Array.from({ length: MONTH_GRID_ROWS * DAYS_PER_WEEK }, (_, index) =>
    addDays(first, index)
  );
}

/** Inclusive millisecond bounds of the range a view needs to query. */
export function rangeFor(view: 'day' | 'week' | 'month' | 'agenda', anchor: Date): {
  from: number;
  to: number;
} {
  if (view === 'day') {
    return { from: startOfDay(anchor).getTime(), to: endOfDay(anchor).getTime() };
  }
  if (view === 'week') {
    const days = weekDays(anchor);
    return { from: days[0].getTime(), to: endOfDay(days[days.length - 1]).getTime() };
  }
  if (view === 'month') {
    const days = monthGridDays(anchor);
    return { from: days[0].getTime(), to: endOfDay(days[days.length - 1]).getTime() };
  }
  // Agenda looks forward, not around: a month ahead from today.
  const start = startOfDay(anchor);
  return { from: start.getTime(), to: endOfDay(addDays(start, 30)).getTime() };
}

/**
 * Hours a timeline must render: the default working span, widened so nothing
 * scheduled outside it disappears.
 */
export function timelineHours(entryHours: readonly number[]): number[] {
  const base = TIMELINE_HOURS;
  const first = entryHours.length > 0 ? Math.min(base[0], ...entryHours) : base[0];
  const last =
    entryHours.length > 0 ? Math.max(base[base.length - 1], ...entryHours) : base[base.length - 1];
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
