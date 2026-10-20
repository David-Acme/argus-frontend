import type { IReminderCacheRow, IReminderSnooze, IServiceResponse } from '@/core/interfaces';
import type { ZoneClock } from '@/core/types';
import { sameTimeTomorrow } from '@/shared/libs/recurrence';
import { REMINDER_SNOOZE_MINUTES, type ReminderSnoozeMinutes } from '@/features/reminders/constants/snooze';
import type { ReminderTiming } from '@/features/reminders/model/reminder-rows';

const MINUTE_MS = 60_000;

const ALREADY_DONE_STATUS = 409;

export type SnoozeChoice = `${ReminderSnoozeMinutes}` | 'tomorrow';

export type SnoozeOption = {
  choice: SnoozeChoice;
  at: number;
};

export type SnoozeOptionsInput = {
  row: Pick<IReminderCacheRow, 'scheduledAt'>;
  now: number;
  clock: ZoneClock;
};

export const isSnoozable = (timing: ReminderTiming): boolean => timing === 'overdue' || timing === 'today';

export function snoozeOptions({ row, now, clock }: SnoozeOptionsInput): SnoozeOption[] {
  const later = REMINDER_SNOOZE_MINUTES.map(
    (minutes): SnoozeOption => ({ choice: `${minutes}`, at: now + minutes * MINUTE_MS })
  ).filter((option) => option.at > row.scheduledAt);
  return [...later, { choice: 'tomorrow', at: sameTimeTomorrow(Math.max(row.scheduledAt, now), clock) }];
}

export const snoozeBodyOf = (choice: SnoozeChoice): IReminderSnooze =>
  choice === 'tomorrow' ? { tomorrow: true } : { minutes: Number(choice) };

export const isAlreadyDone = (response: Pick<IServiceResponse<unknown>, 'status' | 'errors'>): boolean =>
  response.status === ALREADY_DONE_STATUS && response.errors?.code === 'CONFLICT';

export type SnoozedReminders = Readonly<Record<string, number>>;

type SnoozeRow = Pick<IReminderCacheRow, 'id' | 'scheduledAt' | 'isCompleted'>;

const NOT_AN_OCCURRENCE_STATUS = 422;

const NOT_AN_OCCURRENCE = /not an occurrence of this series/i;

export const isSnoozedNow = (memory: SnoozedReminders, row: SnoozeRow): boolean =>
  !row.isCompleted && memory[row.id] === row.scheduledAt;

export type SnoozeRecord = {
  memory: SnoozedReminders;
  id: string;
  at: number;
  rows: readonly SnoozeRow[];
};

export function withSnooze({ memory, id, at, rows }: SnoozeRecord): SnoozedReminders {
  const kept = Object.entries(memory).filter(
    ([key]) => key !== id && rows.some((row) => row.id === key && isSnoozedNow(memory, row))
  );
  return Object.fromEntries([...kept, [id, at]]);
}

export function snoozedAtOf(info: unknown): number | null {
  if (typeof info !== 'object' || info === null || !('scheduledAt' in info)) return null;
  const { scheduledAt } = info;
  return typeof scheduledAt === 'number' && Number.isFinite(scheduledAt) ? scheduledAt * 1000 : null;
}

export function isSnoozedOccurrenceRefusal(response: Pick<IServiceResponse<unknown>, 'status' | 'errors'>): boolean {
  if (response.status !== NOT_AN_OCCURRENCE_STATUS || !response.errors) return false;
  const messages = [response.errors.message, ...(response.errors.list ?? []).map((error) => error.message)];
  return messages.some((message) => NOT_AN_OCCURRENCE.test(message));
}
