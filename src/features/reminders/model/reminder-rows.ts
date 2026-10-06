import type { IReminderCacheRow } from '@/core/interfaces';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import type { TranslateFn } from '@/core/types';

export const REMINDER_DONE_SHOWN = 5;

export type ReminderTiming = 'overdue' | 'today' | 'later' | 'done';

export type ReminderGroups = {
  pending: readonly IReminderCacheRow[];
  done: readonly IReminderCacheRow[];
};

export function splitReminders(rows: readonly IReminderCacheRow[], doneShown = REMINDER_DONE_SHOWN): ReminderGroups {
  const pending = rows.filter((row) => !row.isCompleted).sort((left, right) => left.scheduledAt - right.scheduledAt);
  const done = rows
    .filter((row) => row.isCompleted)
    .sort((left, right) => (right.completedAt ?? right.scheduledAt) - (left.completedAt ?? left.scheduledAt))
    .slice(0, doneShown);
  return { pending, done };
}

export function reminderTiming(row: IReminderCacheRow, now: number, date: Pick<DateFormatter, 'sameDay'>): ReminderTiming {
  if (row.isCompleted) return 'done';
  if (date.sameDay(new Date(row.scheduledAt), new Date(now))) return row.scheduledAt < now ? 'overdue' : 'today';
  return row.scheduledAt < now ? 'overdue' : 'later';
}

export function matchesReminder(row: IReminderCacheRow, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted.length === 0) return true;
  return `${row.title} ${row.description}`.toLowerCase().includes(wanted);
}

export function reminderWhen(
  row: IReminderCacheRow,
  now: number,
  date: Pick<DateFormatter, 'sameDay' | 'addDays' | 'formatTime' | 'formatDayMonth'>,
  t: TranslateFn
): string {
  const at = new Date(row.scheduledAt);
  const today = new Date(now);
  const time = date.formatTime(at);
  if (date.sameDay(at, today)) return t('screens.reminders.when-today', { time });
  if (date.sameDay(at, date.addDays(today, 1))) return t('screens.reminders.when-tomorrow', { time });
  return t('screens.reminders.when-day', { day: date.formatDayMonth(at), time });
}
