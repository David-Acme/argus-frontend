import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { isOpenTask } from '@/shared/libs/task-progress';

export type WeekRange = { from: Date; to: Date };

export type WeekStats = { done: number; pending: number };

type TaskRow = Pick<IProjectTaskCacheRow, 'status' | 'dueAt'>;

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

export function weekStats(rows: readonly TaskRow[], week: WeekRange): WeekStats {
  const due = rows.filter((row) => row.dueAt !== null && within(row.dueAt, week));
  return {
    done: due.filter((row) => row.status === 'done').length,
    pending: due.filter(isOpenTask).length,
  };
}
