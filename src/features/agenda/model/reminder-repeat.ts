import type { IReminderCacheRow } from '@/core/interfaces';
import type { RecurrenceException, RecurrenceFrequency, ZoneClock } from '@/core/types';
import { RECURRENCE_INTERVAL_MIN } from '@/shared/constants';
import {
  formatRecurrenceRule,
  isRecurrenceInterval,
  nextFiring,
  parseRecurrenceRule,
  scheduledOccurrence,
} from '@/shared/libs/recurrence';

export type RepeatChoice = 'none' | RecurrenceFrequency;

export type RepeatDraft = {
  frequency: RecurrenceFrequency | null;
  interval: number;
  monthDay?: number;
};

export const NO_REPEAT: RepeatDraft = { frequency: null, interval: RECURRENCE_INTERVAL_MIN };

export const REPEAT_CHOICES = ['none', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const satisfies readonly [
  'none',
  ...RecurrenceFrequency[],
];

export function repeatDraftOf(rule: string | null | undefined): RepeatDraft {
  const parsed = parseRecurrenceRule(rule);
  if (!parsed) return NO_REPEAT;
  const draft: RepeatDraft = { frequency: parsed.frequency, interval: parsed.interval };
  return parsed.monthDay === undefined ? draft : { ...draft, monthDay: parsed.monthDay };
}

export const repeatChoiceOf = (repeat: RepeatDraft): RepeatChoice => repeat.frequency ?? 'none';

export const isIntervalText = (text: string): boolean =>
  /^\d+$/.test(text.trim()) && isRecurrenceInterval(Number(text.trim()));

export const isRecurrenceIntervalDraft = (repeat: RepeatDraft): boolean =>
  repeat.frequency === null || isRecurrenceInterval(repeat.interval);

export const repeatFromChoice = (choice: RepeatChoice, interval: string): RepeatDraft =>
  choice === 'none' ? NO_REPEAT : { frequency: choice, interval: Number(interval.trim()) };

export const sameRepeat = (left: RepeatDraft, right: RepeatDraft): boolean =>
  left.frequency === right.frequency && (left.frequency === null || left.interval === right.interval);

export function ruleOfRepeat({ frequency, interval, monthDay }: RepeatDraft): string | null {
  if (frequency === null) return null;
  return formatRecurrenceRule(
    frequency === 'MONTHLY' && monthDay !== undefined ? { frequency, interval, monthDay } : { frequency, interval }
  );
}

export const keepingMonthDay = (draft: RepeatDraft, saved: RepeatDraft): RepeatDraft =>
  draft.frequency === 'MONTHLY' && draft.monthDay === undefined && saved.monthDay !== undefined
    ? { ...draft, monthDay: saved.monthDay }
    : draft;

export const repeatsOf = (row: Pick<IReminderCacheRow, 'recurrenceRule'>): boolean =>
  row.recurrenceRule != null && row.recurrenceRule.length > 0;

type ReminderSeriesRow = Pick<IReminderCacheRow, 'scheduledAt' | 'recurrenceRule' | 'recurrenceExceptions'>;

export type ReminderRollInput = {
  row: ReminderSeriesRow;
  now: number;
  clock: ZoneClock;
};

export const currentOccurrence = (row: Pick<IReminderCacheRow, 'scheduledAt' | 'recurrenceExceptions'>): number =>
  scheduledOccurrence(row.recurrenceExceptions, row.scheduledAt);

export const changesOneOccurrence = (row: Pick<IReminderCacheRow, 'recurrenceRule' | 'isCompleted'>): boolean =>
  !row.isCompleted && parseRecurrenceRule(row.recurrenceRule) !== null;

export function rolledSchedule({ row, now, clock }: ReminderRollInput): number | null {
  const rule = parseRecurrenceRule(row.recurrenceRule);
  if (!rule) return null;
  const occurrence = currentOccurrence(row);
  return (
    nextFiring({
      rule,
      anchor: occurrence,
      after: occurrence,
      moment: Math.max(row.scheduledAt, now),
      exceptions: row.recurrenceExceptions ?? [],
      clock,
    })?.at ?? null
  );
}

export type ReminderSkipInput = {
  row: ReminderSeriesRow;
  clock: ZoneClock;
};

export function skippedSchedule({ row, clock }: ReminderSkipInput): number | null {
  const rule = parseRecurrenceRule(row.recurrenceRule);
  if (!rule) return null;
  const occurrence = currentOccurrence(row);
  const exceptions = [
    ...(row.recurrenceExceptions ?? []).filter((exception) => exception.occurrence !== occurrence),
    { occurrence, cancelled: true },
  ];
  return nextFiring({ rule, anchor: occurrence, after: occurrence, moment: occurrence, exceptions, clock })?.at ?? null;
}

type ExceptionChange = Pick<RecurrenceException, 'occurrence' | 'cancelled' | 'startsAt'>;

const restores = (change: ExceptionChange): boolean => !change.cancelled && change.startsAt === undefined;

export function withOccurrenceException(
  exceptions: readonly RecurrenceException[],
  change: ExceptionChange
): RecurrenceException[] {
  const kept = exceptions.filter((exception) => exception.occurrence !== change.occurrence);
  if (!restores(change)) kept.push(change.cancelled ? { occurrence: change.occurrence, cancelled: true } : { ...change });
  return kept.sort((left, right) => left.occurrence - right.occurrence);
}

const EXCEPTION_FIELDS = ['occurrence', 'cancelled', 'startsAt', 'endsAt', 'title', 'location'] as const;

export function sameExceptions(
  left: readonly RecurrenceException[] | undefined,
  right: readonly RecurrenceException[] | undefined
): boolean {
  const a = left ?? [];
  const b = right ?? [];
  return (
    a.length === b.length &&
    a.every((exception, index) => {
      const other = b[index];
      return other !== undefined && EXCEPTION_FIELDS.every((field) => exception[field] === other[field]);
    })
  );
}
