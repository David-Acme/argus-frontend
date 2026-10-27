export type CalendarMonth = { year: number; month: number };

export type CalendarDay = { at: number; day: number; inMonth: boolean };

export type DayLook = { today: boolean; selected: boolean; disabled: boolean };

export type DayLookInput = { today: number; selected: number | null; min: number | null };

export type QuickDays = { today: number; tomorrow: number; weekend: number };

const WEEK = 7;

const SATURDAY = 6;

const SUNDAY = 0;

export const dayStart = (at: number): number => {
  const value = new Date(at);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
};

export const monthOfDay = (at: number): CalendarMonth => {
  const value = new Date(at);
  return { year: value.getFullYear(), month: value.getMonth() };
};

export const daysIn = ({ year, month }: CalendarMonth): number =>
  new Date(year, month + 1, 0).getDate();

export function shiftMonth({ year, month }: CalendarMonth, step: number): CalendarMonth {
  const total = year * 12 + month + step;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function clampDay(target: CalendarMonth, day: number): number {
  return new Date(target.year, target.month, Math.min(day, daysIn(target))).getTime();
}

export function moveToMonth(at: number, target: CalendarMonth): number {
  return clampDay(target, new Date(at).getDate());
}

export function weekdayOrder(weekStart: number): number[] {
  return Array.from({ length: WEEK }, (_, index) => (weekStart + index) % WEEK);
}

export function monthGrid(target: CalendarMonth, weekStart: number): CalendarDay[] {
  const first = new Date(target.year, target.month, 1);
  const lead = (first.getDay() - weekStart + WEEK) % WEEK;
  const weeks = Math.ceil((lead + daysIn(target)) / WEEK);
  return Array.from({ length: weeks * WEEK }, (_, index) => {
    const value = new Date(target.year, target.month, 1 - lead + index);
    return {
      at: value.getTime(),
      day: value.getDate(),
      inMonth: value.getMonth() === target.month,
    };
  });
}

export function dayLook(at: number, { today, selected, min }: DayLookInput): DayLook {
  return {
    today: at === today,
    selected: selected !== null && at === dayStart(selected),
    disabled: min !== null && at < dayStart(min),
  };
}

export function quickDays(now: number): QuickDays {
  const today = dayStart(now);
  const value = new Date(today);
  const weekday = value.getDay();
  const ahead = weekday === SATURDAY || weekday === SUNDAY ? 0 : SATURDAY - weekday;
  return {
    today,
    tomorrow: new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1).getTime(),
    weekend: new Date(value.getFullYear(), value.getMonth(), value.getDate() + ahead).getTime(),
  };
}

export function yearSpan(center: number, reach: number): number[] {
  return Array.from({ length: reach * 2 + 1 }, (_, index) => center - reach + index);
}

const DAY_STEPS: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -WEEK,
  ArrowDown: WEEK,
};

const MONTH_STEPS: Record<string, number> = { PageUp: -1, PageDown: 1 };

const plusDays = (at: number, days: number): number => {
  const value = new Date(at);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days).getTime();
};

export function gridKey(at: number, key: string, weekStart: number): number | null {
  const days = Object.hasOwn(DAY_STEPS, key) ? DAY_STEPS[key] : undefined;
  if (days !== undefined) return plusDays(at, days);
  const months = Object.hasOwn(MONTH_STEPS, key) ? MONTH_STEPS[key] : undefined;
  if (months !== undefined) return moveToMonth(at, shiftMonth(monthOfDay(at), months));
  const lead = (new Date(at).getDay() - weekStart + WEEK) % WEEK;
  if (key === 'Home') return plusDays(at, -lead);
  if (key === 'End') return plusDays(at, WEEK - 1 - lead);
  return null;
}
