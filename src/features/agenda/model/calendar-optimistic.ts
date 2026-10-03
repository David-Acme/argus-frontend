import type { ICalendarEventCreate, IProjectTaskCreate } from '@/core/interfaces';
import type { AgendaStatus, CalendarEntry, CalendarSource, ProjectTaskStatus } from '@/core/types';
import { defineLens, isPendingRecordId, type OptimisticLens } from '@/shared/libs/optimistic';
import { calendarEntryRecordId } from '@/features/agenda/model/calendar-entry-actions';

const recordIdFor = (entry: CalendarEntry, source: CalendarSource): string | null =>
  entry.source === source ? calendarEntryRecordId(entry) : null;

const optionalText = (
  value: string | undefined,
  fallback: string | undefined
): string | undefined => (value === undefined ? fallback : value || undefined);

const msFromSeconds = (value: number | undefined): number | null =>
  value == null ? null : value * 1000;

export function agendaStatusOf(status: ProjectTaskStatus | string): AgendaStatus {
  if (status === 'done') return 'complete';
  if (status === 'doing') return 'active';
  return 'upcoming';
}

const calendarEventLens = defineLens<CalendarEntry, ICalendarEventCreate>({
  table: 'calendar_event',
  recordIdOf: (entry) => recordIdFor(entry, 'event'),
  patch: (entry, values) => ({
    ...entry,
    title: values.title ?? entry.title,
    startsAt: values.startsAt === undefined ? entry.startsAt : values.startsAt * 1000,
    endsAt: values.endsAt === undefined ? entry.endsAt : msFromSeconds(values.endsAt),
    isAllDay: values.isAllDay ?? entry.isAllDay,
    location: optionalText(values.location, entry.location),
    description: optionalText(values.description, entry.description),
  }),
  create: (recordId, values) =>
    values.startsAt === undefined
      ? null
      : {
          id: `event:${recordId}`,
          source: 'event',
          title: values.title ?? '',
          startsAt: values.startsAt * 1000,
          endsAt: msFromSeconds(values.endsAt),
          isAllDay: values.isAllDay ?? false,
          status: 'upcoming',
          color: values.color || undefined,
          location: values.location || undefined,
          description: values.description || undefined,
          projectId: values.projectId == null ? null : String(values.projectId),
        },
});

const calendarTaskLens = defineLens<CalendarEntry, IProjectTaskCreate>({
  table: 'project_task',
  recordIdOf: (entry) => recordIdFor(entry, 'task'),
  patch: (entry, values) => ({
    ...entry,
    title: values.title ?? entry.title,
    status: values.status === undefined ? entry.status : agendaStatusOf(values.status),
    startsAt: values.dueAt === undefined ? entry.startsAt : values.dueAt * 1000,
  }),
  create: (recordId, values) =>
    values.dueAt == null
      ? null
      : {
          id: `task:${recordId}`,
          source: 'task',
          title: values.title ?? '',
          startsAt: values.dueAt * 1000,
          endsAt: null,
          isAllDay: true,
          status: agendaStatusOf(values.status ?? 'todo'),
          projectId: String(values.projectId),
        },
});

export const CALENDAR_LENSES: readonly OptimisticLens<CalendarEntry>[] = [
  calendarEventLens,
  calendarTaskLens,
];

export const byStart = (left: CalendarEntry, right: CalendarEntry): number =>
  left.startsAt - right.startsAt;

export const isPendingEntry = (entry: CalendarEntry): boolean =>
  isPendingRecordId(calendarEntryRecordId(entry));
