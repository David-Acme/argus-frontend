import type { IReminderCacheRow } from '@/core/interfaces';

export type WeekRange = { from: Date; to: Date };

export type WeekStats = { onTime: number; pending: number };

type ReminderRow = Pick<IReminderCacheRow, 'scheduledAt' | 'isCompleted' | 'completedAt'>;

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
const SUNDAY = 0;

export function weekOf(now: Date): WeekRange {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  const day = from.getDay();
  from.setDate(from.getDate() - (day === SUNDAY ? WEEK_DAYS - 1 : day - 1));
  const to = new Date(from);
  to.setDate(to.getDate() + WEEK_DAYS - 1);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

const within = (at: number, week: WeekRange): boolean =>
  at >= week.from.getTime() && at <= week.to.getTime();

const endOfDay = (at: number): number => {
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  return day.getTime() + DAY_MS - 1;
};

const onTime = (row: ReminderRow): boolean =>
  row.isCompleted && row.completedAt !== null && row.completedAt <= endOfDay(row.scheduledAt);

export function weekStats(rows: readonly ReminderRow[], week: WeekRange): WeekStats {
  return {
    onTime: rows.filter(
      (row) => row.completedAt !== null && within(row.completedAt, week) && onTime(row)
    ).length,
    pending: rows.filter((row) => !row.isCompleted && within(row.scheduledAt, week)).length,
  };
}
