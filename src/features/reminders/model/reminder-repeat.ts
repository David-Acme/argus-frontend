import type { IReminderCacheRow } from '@/core/interfaces';
import type { RecurrenceFrequency, ZoneClock } from '@/core/types';
import { RECURRENCE_INTERVAL_MIN } from '@/shared/constants';
import {
  firstOccurrenceAfter,
  formatRecurrenceRule,
  isRecurrenceInterval,
  parseRecurrenceRule,
} from '@/shared/libs/recurrence';

export type RepeatChoice = 'none' | RecurrenceFrequency;

export type RepeatDraft = {
  frequency: RecurrenceFrequency | null;
  interval: number;
};

export const NO_REPEAT: RepeatDraft = { frequency: null, interval: RECURRENCE_INTERVAL_MIN };

export const REPEAT_CHOICES = ['none', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const satisfies readonly [
  'none',
  ...RecurrenceFrequency[],
];

export function repeatDraftOf(rule: string | null | undefined): RepeatDraft {
  const parsed = parseRecurrenceRule(rule);
  return parsed ? { frequency: parsed.frequency, interval: parsed.interval } : NO_REPEAT;
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

export const ruleOfRepeat = ({ frequency, interval }: RepeatDraft): string | null =>
  frequency === null ? null : formatRecurrenceRule({ frequency, interval });

export const repeatsOf = (row: Pick<IReminderCacheRow, 'recurrenceRule'>): boolean =>
  row.recurrenceRule != null && row.recurrenceRule.length > 0;

export type ReminderRollInput = {
  row: Pick<IReminderCacheRow, 'scheduledAt' | 'recurrenceRule'>;
  now: number;
  clock: ZoneClock;
};

export function rolledSchedule({ row, now, clock }: ReminderRollInput): number | null {
  const rule = parseRecurrenceRule(row.recurrenceRule);
  if (!rule) return null;
  return firstOccurrenceAfter({ rule, anchor: row.scheduledAt, moment: Math.max(row.scheduledAt, now), clock });
}
