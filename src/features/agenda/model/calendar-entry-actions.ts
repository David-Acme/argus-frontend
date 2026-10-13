import type { CalendarEntry, CalendarEntryState } from '@/core/types';
import type { Href } from 'expo-router';

export type CalendarEntryAction = 'edit' | 'delete' | 'toggle' | 'share';
export type CalendarEventFormAction = 'cancel' | 'save';
export type CalendarEntryDetailRow = {
  id: 'type' | 'date' | 'time' | 'status' | 'repeat' | 'location';
  label: string;
  value: string;
};

export type CalendarEntryDetailLabels = {
  type: string;
  status: string;
  date: string;
  time: string;
  allDay: string;
  location: string;
  event: string;
  task: string;
  reminder: string;
  state: Record<CalendarEntryState, string>;
  repeat?: { label: string; value: string | null };
};

type CalendarEntryPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  canShare?: boolean;
};

export type CalendarShareViewer = {
  userId: string;
  canManageShares: boolean;
};

export function canShareCalendarEntry(entry: CalendarEntry, viewer: CalendarShareViewer): boolean {
  return entry.source === 'event' && viewer.canManageShares && entry.ownerId === viewer.userId;
}

type CanFn = (table: 'project_task' | 'calendar_event', permission: 'update' | 'delete') => boolean;

export function entryPermissions(entry: Pick<CalendarEntry, 'source'>, can: CanFn): CalendarEntryPermissions {
  const table = entry.source === 'task' ? 'project_task' : 'calendar_event';
  return { canEdit: can(table, 'update'), canDelete: can(table, 'delete') };
}

export function calendarEventFormActions(): readonly CalendarEventFormAction[] {
  return ['cancel', 'save'];
}

export function shouldShowCalendarEntryOverflow(isNative: boolean): boolean {
  return !isNative;
}

export function calendarEntryDetailDialogLayout(): {
  contentClassName: string;
  footerClassName: string;
} {
  return {
    contentClassName: 'sm:max-w-[460px]',
    footerClassName: 'self-end pb-3',
  };
}

export type CalendarEntryDetailInput = {
  entry: CalendarEntry;
  state: CalendarEntryState;
  labels: CalendarEntryDetailLabels;
  formatDate: (value: number) => string;
  formatTime: (entry: CalendarEntry) => string;
};

export function calendarEntryDetailRows({
  entry,
  state,
  labels,
  formatDate,
  formatTime,
}: CalendarEntryDetailInput): readonly CalendarEntryDetailRow[] {
  const sourceLabel = {
    event: labels.event,
    task: labels.task,
    reminder: labels.reminder,
  }[entry.source];
  const rows: CalendarEntryDetailRow[] = [
    { id: 'type', label: labels.type, value: sourceLabel },
    { id: 'date', label: labels.date, value: formatDate(entry.startsAt) },
    {
      id: 'time',
      label: labels.time,
      value: entry.isAllDay ? labels.allDay : formatTime(entry),
    },
    { id: 'status', label: labels.status, value: labels.state[state] },
  ];

  if (labels.repeat?.value) rows.push({ id: 'repeat', label: labels.repeat.label, value: labels.repeat.value });
  if (entry.location) rows.push({ id: 'location', label: labels.location, value: entry.location });
  return rows;
}

export function compareDayEntries(
  left: Pick<CalendarEntry, 'isAllDay' | 'startsAt'>,
  right: Pick<CalendarEntry, 'isAllDay' | 'startsAt'>,
): number {
  return Number(right.isAllDay) - Number(left.isAllDay) || left.startsAt - right.startsAt;
}

export function calendarEntryRecordId(entry: Pick<CalendarEntry, 'id'>): string {
  const recordId = entry.id.slice(entry.id.indexOf(':') + 1);
  const occurrence = recordId.indexOf('@');
  return occurrence < 0 ? recordId : recordId.slice(0, occurrence);
}

export const isOccurrence = (entry: Pick<CalendarEntry, 'series'>): boolean => entry.series !== undefined;

export function availableCalendarEntryActions(
  entry: CalendarEntry,
  { canEdit, canDelete, canShare = false }: CalendarEntryPermissions
): CalendarEntryAction[] {
  if (entry.source === 'reminder') return [];

  const actions: CalendarEntryAction[] = [];
  if (canEdit) actions.push('edit');
  if (entry.source === 'task' && canEdit) actions.push('toggle');
  if (canShare) actions.push('share');
  if (canDelete) actions.push('delete');
  return actions;
}

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
