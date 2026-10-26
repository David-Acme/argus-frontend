import type { IReminderCacheRow, IReminderSnooze, IServiceResponse } from '@/core/interfaces';
import type { RecurrenceException, ZoneClock } from '@/core/types';
import { firstOccurrenceAfter, parseRecurrenceRule, sameTimeTomorrow } from '@/shared/libs/recurrence';
import { REMINDER_SNOOZE_MINUTES, type ReminderSnoozeMinutes } from '@/features/agenda/constants/snooze.constant';
import {
  currentOccurrence,
  skippedSchedule,
  withOccurrenceException,
} from '@/features/agenda/model/reminder-repeat';
import type { ReminderTiming } from '@/features/agenda/model/reminder-rows';

const MINUTE_MS = 60_000;

const ALREADY_DONE_STATUS = 409;

export type SnoozeChoice = `${ReminderSnoozeMinutes}` | 'tomorrow';

export type SnoozeOption = {
  choice: SnoozeChoice;
  at: number;
  folds: boolean;
};

type SnoozeRow = Pick<IReminderCacheRow, 'scheduledAt' | 'recurrenceRule' | 'recurrenceExceptions'>;

export type SnoozeOptionsInput = {
  row: SnoozeRow;
  now: number;
  clock: ZoneClock;
};

export type SnoozeOutcomeInput = {
  row: SnoozeRow;
  target: number;
  clock: ZoneClock;
};

export type SnoozeOutcome = {
  at: number;
  folds: boolean;
  exceptions: RecurrenceException[] | null;
};

export const isSnoozable = (timing: ReminderTiming): boolean => timing === 'overdue' || timing === 'today';

export function snoozeOutcome({ row, target, clock }: SnoozeOutcomeInput): SnoozeOutcome {
  const rule = parseRecurrenceRule(row.recurrenceRule);
  if (!rule) return { at: target, folds: false, exceptions: null };
  const occurrence = currentOccurrence(row);
  const known = row.recurrenceExceptions ?? [];
  const next = firstOccurrenceAfter({ rule, anchor: occurrence, moment: occurrence, clock });
  if (next === null || target < next) {
    const change = target === occurrence ? { occurrence, cancelled: false } : { occurrence, cancelled: false, startsAt: target };
    return { at: target, folds: false, exceptions: withOccurrenceException(known, change) };
  }
  return {
    at: skippedSchedule({ row, clock }) ?? next,
    folds: true,
    exceptions: withOccurrenceException(known, { occurrence, cancelled: true }),
  };
}

type SnoozeTarget = { choice: SnoozeChoice; target: number };

function snoozeTargets({ row, now, clock }: SnoozeOptionsInput): SnoozeTarget[] {
  const later = REMINDER_SNOOZE_MINUTES.map(
    (minutes): SnoozeTarget => ({ choice: `${minutes}`, target: now + minutes * MINUTE_MS })
  ).filter((option) => option.target > row.scheduledAt);
  return [...later, { choice: 'tomorrow', target: sameTimeTomorrow(Math.max(row.scheduledAt, now), clock) }];
}

export function snoozeOptions(input: SnoozeOptionsInput): SnoozeOption[] {
  return snoozeTargets(input).map(({ choice, target }) => {
    const { at, folds } = snoozeOutcome({ row: input.row, target, clock: input.clock });
    return { choice, at, folds };
  });
}

export type SnoozeChoiceInput = SnoozeOptionsInput & { choice: SnoozeChoice };

export function snoozeOutcomeOf({ choice, ...input }: SnoozeChoiceInput): SnoozeOutcome | null {
  const found = snoozeTargets(input).find((option) => option.choice === choice);
  return found ? snoozeOutcome({ row: input.row, target: found.target, clock: input.clock }) : null;
}

export type SnoozeIntentValues = {
  scheduledAt: number;
  recurrenceExceptions?: RecurrenceException[];
};

export function snoozeIntentValues({ at, exceptions }: SnoozeOutcome): SnoozeIntentValues {
  const scheduledAt = Math.round(at / 1000);
  return exceptions === null ? { scheduledAt } : { scheduledAt, recurrenceExceptions: exceptions };
}

export const snoozeBodyOf = (choice: SnoozeChoice): IReminderSnooze =>
  choice === 'tomorrow' ? { tomorrow: true } : { minutes: Number(choice) };

export const isAlreadyDone = (response: Pick<IServiceResponse<unknown>, 'status' | 'errors'>): boolean =>
  response.status === ALREADY_DONE_STATUS && response.errors?.code === 'CONFLICT';
