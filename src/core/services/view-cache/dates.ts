export const DAY_MS = 86_400_000;

export const addDays = (value: Date, days: number): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);

export const startOfDay = (value: Date): number => addDays(value, 0).getTime();

export const startOfNextDay = (value: Date): number => addDays(value, 1).getTime();

export const endOfDay = (value: Date): number => startOfNextDay(value) - 1;

export const calendarDaysBetween = (later: Date, earlier: Date): number =>
  Math.round((startOfDay(later) - startOfDay(earlier)) / DAY_MS);
