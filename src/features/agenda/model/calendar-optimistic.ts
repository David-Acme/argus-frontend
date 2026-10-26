import type {
  ICalendarEventUpdate,
  IOccurrenceChange,
  IProjectTaskCreate,
  IProjectTaskUpdate,
} from '@/core/interfaces';
import type { AgendaStatus, CalendarEntry, CalendarSource, ProjectTaskStatus } from '@/core/types';
import { defineLens, isPendingRecordId } from '@/shared/libs/optimistic';
import type { OptimisticLens } from '@/shared/libs/optimistic';
import {
  calendarEntryRecordId,
  isOccurrence,
  occurrenceOf,
} from '@/features/agenda/model/calendar-entry-actions';

type TaskIntentValues = IProjectTaskUpdate & Pick<IProjectTaskCreate, 'projectId'>;

type EventIntentValues = ICalendarEventUpdate &
  Partial<Pick<IOccurrenceChange, 'occurrence' | 'cancelled'>>;

const recordIdFor = (entry: CalendarEntry, source: CalendarSource): string | null =>
  entry.source === source ? calendarEntryRecordId(entry) : null;

const optionalText = (
  value: string | null | undefined,
  fallback: string | undefined
): string | undefined => (value === undefined ? fallback : value || undefined);

const msFromSeconds = (value: number | null | undefined): number | null =>
  value == null ? null : value * 1000;

const targetsEntry = (entry: CalendarEntry, values: Partial<EventIntentValues>): boolean =>
  values.occurrence !== undefined && occurrenceOf(entry) === values.occurrence * 1000;

function patchOccurrence(entry: CalendarEntry, values: Partial<EventIntentValues>): CalendarEntry {
  if (!targetsEntry(entry, values)) return entry;
  const startsAt = values.startsAt === undefined ? entry.startsAt : values.startsAt * 1000;
  const span = entry.endsAt === null ? null : entry.endsAt - entry.startsAt;
  return {
    ...entry,
    title: values.title ?? entry.title,
    location: optionalText(values.location, entry.location),
    startsAt,
    endsAt: values.endsAt == null ? (span === null ? null : startsAt + span) : values.endsAt * 1000,
  };
}

export function agendaStatusOf(status: ProjectTaskStatus | string): AgendaStatus {
  if (status === 'done') return 'complete';
  if (status === 'doing') return 'active';
  return 'upcoming';
}

const calendarEventLens = defineLens<CalendarEntry, EventIntentValues>({
  table: 'calendar_event',
  recordIdOf: (entry) => recordIdFor(entry, 'event'),
  hides: (entry, values) => values.cancelled === true && targetsEntry(entry, values),
  patch: (entry, values) => {
    if (values.occurrence !== undefined) return patchOccurrence(entry, values);
    const described: CalendarEntry = {
      ...entry,
      title: values.title ?? entry.title,
      location: optionalText(values.location, entry.location),
      description: optionalText(values.description, entry.description),
    };
    if (isOccurrence(entry)) return described;
    return {
      ...described,
      startsAt: values.startsAt === undefined ? entry.startsAt : values.startsAt * 1000,
      endsAt: values.endsAt === undefined ? entry.endsAt : msFromSeconds(values.endsAt),
      isAllDay: values.isAllDay ?? entry.isAllDay,
    };
  },
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

const calendarTaskLens = defineLens<CalendarEntry, TaskIntentValues>({
  table: 'project_task',
  recordIdOf: (entry) => recordIdFor(entry, 'task'),
  patch: (entry, values) => ({
    ...entry,
    title: values.title ?? entry.title,
    status: values.status === undefined ? entry.status : agendaStatusOf(values.status),
    startsAt: values.dueAt == null ? entry.startsAt : values.dueAt * 1000,
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
