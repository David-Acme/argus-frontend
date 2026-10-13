import type { IReminderCacheRow, IReminderUpdate } from '@/core/interfaces';
import {
  isRecurrenceIntervalDraft,
  repeatDraftOf,
  ruleOfRepeat,
  sameRepeat,
  type RepeatDraft,
} from '@/features/reminders/model/reminder-repeat';

export const REMINDER_TITLE_MAX = 200;
export const REMINDER_DESCRIPTION_MAX = 2000;

export type ReminderDraft = {
  title: string;
  description: string;
  at: number;
  repeat?: RepeatDraft;
};

export type DraftIssue = 'title-required' | 'title-long' | 'description-long' | 'time-invalid' | 'interval-invalid';

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
  if (draft.repeat && !sameRepeat(draft.repeat, repeatDraftOf(saved.recurrenceRule))) {
    body.recurrenceRule = ruleOfRepeat(draft.repeat);
  }
  return body;
}

export const isEmptyUpdate = (body: IReminderUpdate): boolean => Object.keys(body).length === 0;
