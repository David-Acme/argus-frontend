import type { CalendarEntry } from '@/core/types';
import type { Href } from 'expo-router';

export type CalendarEntryAction = 'edit' | 'delete' | 'toggle';
export type CalendarEventFormAction = 'cancel' | 'save';
export type CalendarEntryDetailRow = {
  id: 'type' | 'date' | 'time' | 'status' | 'location';
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
  upcoming: string;
  active: string;
  complete: string;
};

type CalendarEntryPermissions = {
  canEdit: boolean;
  canDelete: boolean;
};

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

export function calendarEntryDetailRows(
  entry: CalendarEntry,
  labels: CalendarEntryDetailLabels,
  formatDate: (value: number) => string,
  formatTime: (entry: CalendarEntry) => string
): readonly CalendarEntryDetailRow[] {
  const sourceLabel = {
    event: labels.event,
    task: labels.task,
    reminder: labels.reminder,
  }[entry.source];
  const statusLabel = {
    upcoming: labels.upcoming,
    active: labels.active,
    complete: labels.complete,
  }[entry.status];
  const rows: CalendarEntryDetailRow[] = [
    { id: 'type', label: labels.type, value: sourceLabel },
    { id: 'date', label: labels.date, value: formatDate(entry.startsAt) },
    {
      id: 'time',
      label: labels.time,
      value: entry.isAllDay ? labels.allDay : formatTime(entry),
    },
    { id: 'status', label: labels.status, value: statusLabel },
  ];

  if (entry.location) rows.push({ id: 'location', label: labels.location, value: entry.location });
  return rows;
}

export function calendarEntryRecordId(entry: CalendarEntry): string {
  return entry.id.slice(entry.id.indexOf(':') + 1);
}

export function availableCalendarEntryActions(
  entry: CalendarEntry,
  { canEdit, canDelete }: CalendarEntryPermissions
): CalendarEntryAction[] {
  if (entry.source === 'reminder') return [];

  const actions: CalendarEntryAction[] = [];
  if (canEdit) actions.push('edit');
  if (entry.source === 'task' && canEdit) actions.push('toggle');
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
