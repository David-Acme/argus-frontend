import type { IOccurrenceChange, IReminderCacheRow, IReminderUpdate } from '@/core/interfaces';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import {
  currentOccurrence,
  repeatChoiceOf,
  isRecurrenceIntervalDraft,
  keepingMonthDay,
  repeatDraftOf,
  ruleOfRepeat,
  sameRepeat,
} from '@/features/agenda/model/reminder-repeat';
import type { RepeatChoice, RepeatDraft } from '@/features/agenda/model/reminder-repeat';

export const REMINDER_TITLE_MAX = 200;
export const REMINDER_DESCRIPTION_MAX = 2000;

export type ReminderDraft = {
  title: string;
  description: string;
  at: number;
  repeat?: RepeatDraft;
};

export type ReminderFormValues = {
  title: string;
  description: string;
  time: string;
  day: number;
  repeat: RepeatChoice;
  interval: string;
};

export function reminderFormValues(
  row: Pick<IReminderCacheRow, 'title' | 'description' | 'scheduledAt' | 'recurrenceRule'>,
  date: Pick<DateFormatter, 'formatInputTime' | 'startOfDay'>
): ReminderFormValues {
  const at = new Date(row.scheduledAt);
  const saved = repeatDraftOf(row.recurrenceRule);
  return {
    title: row.title,
    description: row.description,
    time: date.formatInputTime(at),
    day: date.startOfDay(at).getTime(),
    repeat: repeatChoiceOf(saved),
    interval: String(saved.interval),
  };
}

export type DraftIssue =
  'title-required' | 'title-long' | 'description-long' | 'time-invalid' | 'interval-invalid';

const seconds = (ms: number): number => Math.round(ms / 1000);

export const draftOf = (row: IReminderCacheRow | null, fallbackAt: number): ReminderDraft => ({
  title: row?.title ?? '',
  description: row?.description ?? '',
  at: row?.scheduledAt ?? fallbackAt,
  repeat: repeatDraftOf(row?.recurrenceRule),
});

export function draftIssues(draft: ReminderDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const title = draft.title.trim();
  if (title.length === 0) issues.push('title-required');
  if (title.length > REMINDER_TITLE_MAX) issues.push('title-long');
  if (draft.description.trim().length > REMINDER_DESCRIPTION_MAX) issues.push('description-long');
  if (!Number.isFinite(draft.at) || draft.at <= 0) issues.push('time-invalid');
  if (draft.repeat && !isRecurrenceIntervalDraft(draft.repeat)) issues.push('interval-invalid');
  return issues;
}

export function updateBody(saved: IReminderCacheRow, draft: ReminderDraft): IReminderUpdate {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const body: IReminderUpdate = {};
  if (title !== saved.title) body.title = title;
  if (description !== saved.description.trim()) body.description = description;
  if (seconds(draft.at) !== seconds(saved.scheduledAt)) body.scheduledAt = seconds(draft.at);
  const savedRepeat = repeatDraftOf(saved.recurrenceRule);
  if (draft.repeat && !sameRepeat(draft.repeat, savedRepeat)) {
    body.recurrenceRule = ruleOfRepeat(keepingMonthDay(draft.repeat, savedRepeat));
  }
  return body;
}

export const isEmptyUpdate = (body: IReminderUpdate): boolean => Object.keys(body).length === 0;

export type OccurrenceMove = Pick<IOccurrenceChange, 'occurrence' | 'startsAt'>;

export function occurrenceMoveBody(saved: IReminderCacheRow, at: number): OccurrenceMove | null {
  if (seconds(at) === seconds(saved.scheduledAt)) return null;
  return { occurrence: seconds(currentOccurrence(saved)), startsAt: seconds(at) };
}
