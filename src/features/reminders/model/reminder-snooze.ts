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
