import type { IOccurrenceChange } from '@/core/interfaces';
import type { CalendarEntry, ConfirmRequest } from '@/core/types';
import type { Href } from 'expo-router';

export type CalendarShareViewer = {
  userId: string;
  canManageShares: boolean;
};

export function canShareCalendarEntry(entry: CalendarEntry, viewer: CalendarShareViewer): boolean {
  return entry.source === 'event' && viewer.canManageShares && entry.ownerId === viewer.userId;
}

export function calendarEntryRecordId(entry: Pick<CalendarEntry, 'id'>): string {
  const recordId = entry.id.slice(entry.id.indexOf(':') + 1);
  const occurrence = recordId.indexOf('@');
  return occurrence < 0 ? recordId : recordId.slice(0, occurrence);
}

export const isOccurrence = (entry: Pick<CalendarEntry, 'series'>): boolean =>
  entry.series !== undefined;

export function occurrenceOf(entry: Pick<CalendarEntry, 'id' | 'series'>): number | null {
  if (!isOccurrence(entry)) return null;
  const at = entry.id.indexOf('@');
  if (at < 0) return null;
  const occurrence = Date.parse(entry.id.slice(at + 1));
  return Number.isFinite(occurrence) ? occurrence : null;
}

const toSeconds = (ms: number): number => Math.round(ms / 1000);

export const skipOccurrenceBody = (occurrence: number): IOccurrenceChange => ({
  occurrence: toSeconds(occurrence),
  cancelled: true,
});

export type OccurrenceEdit = {
  occurrence: number;
  title: string;
  location: string;
  startsAt: number;
  endsAt: number | null;
};

export function editOccurrenceBody({
  occurrence,
  title,
  location,
  startsAt,
  endsAt,
}: OccurrenceEdit): IOccurrenceChange {
  const body: IOccurrenceChange = {
    occurrence: toSeconds(occurrence),
    title,
    location,
    startsAt: toSeconds(startsAt),
  };
  if (endsAt !== null) body.endsAt = toSeconds(endsAt);
  return body;
}

export type SeriesDeleteLabels = Pick<ConfirmRequest, 'title' | 'description' | 'confirmLabel'>;

export const seriesDeleteConfirm = (
  entry: Pick<CalendarEntry, 'series'>,
  labels: SeriesDeleteLabels
): ConfirmRequest | undefined =>
  isOccurrence(entry) ? { ...labels, intent: 'danger' } : undefined;

export function calendarEntryEditHref(entry: CalendarEntry): Href | null {
  const recordId = calendarEntryRecordId(entry);
  if (entry.source === 'event') {
    return { pathname: '/agenda', params: { edit: recordId, at: String(entry.startsAt) } };
  }
  if (entry.source === 'task' && entry.projectId) {
    return { pathname: '/projects', params: { id: entry.projectId, task: recordId } };
  }
  return null;
}
