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

/**
 * Deletion is deliberately absent from the event editor. It stays in the
 * entry action menu, where the user receives a separate confirmation step.
 */
export function calendarEventFormActions(): readonly CalendarEventFormAction[] {
  return ['cancel', 'save'];
}

/** Overflow affordances are reserved for the mouse/pointer experience on web. */
export function shouldShowCalendarEntryOverflow(isNative: boolean): boolean {
  return !isNative;
}

/** Keeps the detail panel compact while giving its lone close action room. */
export function calendarEntryDetailDialogLayout(): {
  contentClassName: string;
  footerClassName: string;
} {
  return {
    contentClassName: 'sm:max-w-[460px]',
    footerClassName: 'self-end pb-3',
  };
}

/** Builds the short, readable summary shown when an entry is selected. */
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

/** Removes the source prefix from an entry merged from several local tables. */
export function calendarEntryRecordId(entry: CalendarEntry): string {
  return entry.id.slice(entry.id.indexOf(':') + 1);
}

/** Actions accepted by the backend for each kind of schedule entry. */
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
