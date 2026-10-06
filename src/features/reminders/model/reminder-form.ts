import type { IReminderCacheRow, IReminderCreate, IReminderUpdate } from '@/core/interfaces';

export const REMINDER_TITLE_MAX = 200;
export const REMINDER_DESCRIPTION_MAX = 2000;

export type ReminderDraft = {
  title: string;
  description: string;
  at: number;
};

export type DraftIssue = 'title-required' | 'title-long' | 'description-long' | 'time-invalid';

const seconds = (ms: number): number => Math.round(ms / 1000);

export const draftOf = (row: IReminderCacheRow | null, fallbackAt: number): ReminderDraft => ({
  title: row?.title ?? '',
  description: row?.description ?? '',
  at: row?.scheduledAt ?? fallbackAt,
});

export function draftIssues(draft: ReminderDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const title = draft.title.trim();
  if (title.length === 0) issues.push('title-required');
  if (title.length > REMINDER_TITLE_MAX) issues.push('title-long');
  if (draft.description.trim().length > REMINDER_DESCRIPTION_MAX) issues.push('description-long');
  if (!Number.isFinite(draft.at) || draft.at <= 0) issues.push('time-invalid');
  return issues;
}

export function createBody(draft: ReminderDraft): IReminderCreate {
  const description = draft.description.trim();
  return {
    title: draft.title.trim(),
    ...(description ? { description } : {}),
    scheduledAt: seconds(draft.at),
  };
}

export function updateBody(saved: IReminderCacheRow, draft: ReminderDraft): IReminderUpdate {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const body: IReminderUpdate = {};
  if (title !== saved.title) body.title = title;
  if (description !== saved.description.trim()) body.description = description;
  if (seconds(draft.at) !== seconds(saved.scheduledAt)) body.scheduledAt = seconds(draft.at);
  return body;
}

export const isEmptyUpdate = (body: IReminderUpdate): boolean => Object.keys(body).length === 0;
