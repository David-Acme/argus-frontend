import type {
  ICalendarEventCacheSource,
  IProjectTaskCalendarCacheSource,
  IReminderCacheSource,
} from '@/core/interfaces';
import type {
  AgendaFeed,
  AgendaStatus,
  AgendaWindow,
  CalendarEntry,
  CalendarEntryState,
} from '@/core/types';
import { CALENDAR_OPEN_EVENT_MS } from '@/shared/constants/calendar.constant';
import {
  VIEW_CACHE_CALENDAR_ENTRY_LIMIT,
  VIEW_CACHE_CALENDAR_LEAD_DAYS,
  VIEW_CACHE_CALENDAR_MONTH_DAYS,
  VIEW_CACHE_KEYS,
} from '@/shared/constants/cache.constant';
import { addDays, endOfDay, startOfDay } from './dates';
import type { ProjectionContext, ViewWrite } from './projection';

export type CalendarProjectionInput = {
  events: readonly ICalendarEventCacheSource[];
  reminders: readonly IReminderCacheSource[];
  tasks: readonly IProjectTaskCalendarCacheSource[];
};

type Range = { from: number; to: number };

export const calendarMonthScope = (value: Date): string =>
  `month.${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

export const calendarMonthRange = (value: Date): Range => ({
  from: new Date(value.getFullYear(), value.getMonth(), 1 - VIEW_CACHE_CALENDAR_LEAD_DAYS).getTime(),
  to: new Date(value.getFullYear(), value.getMonth(), 1 + VIEW_CACHE_CALENDAR_MONTH_DAYS).getTime() - 1,
});

export const toCalendarEntries = (
  events: readonly ICalendarEventCacheSource[],
  reminders: readonly IReminderCacheSource[],
  tasks: readonly IProjectTaskCalendarCacheSource[],
  from: number,
  to: number,
): CalendarEntry[] => {
  const entries: CalendarEntry[] = [];

  for (const event of events) {
    const startsAt = event.startsAt.getTime();
    if (startsAt < from || startsAt > to) continue;
    entries.push({
      id: `event:${event.id}`,
      source: 'event',
      title: event.title,
      startsAt,
      endsAt: event.endsAt?.getTime() ?? null,
      isAllDay: event.isAllDay,
      status: 'upcoming',
      color: event.color || undefined,
      location: event.location || undefined,
      description: event.description || undefined,
      projectId: event.projectId,
    });
  }

  for (const reminder of reminders) {
    const startsAt = reminder.scheduledAt.getTime();
    if (startsAt < from || startsAt > to) continue;
    entries.push({
      id: `reminder:${reminder.id}`,
      source: 'reminder',
      title: reminder.title,
      startsAt,
      endsAt: null,
      isAllDay: false,
      status: reminder.isCompleted ? 'complete' : 'upcoming',
    });
  }

  for (const task of tasks) {
    if (!task.dueAt) continue;
    const startsAt = task.dueAt.getTime();
    if (startsAt < from || startsAt > to) continue;
    const status: AgendaStatus =
      task.status === 'done' ? 'complete' : task.status === 'doing' ? 'active' : 'upcoming';
    entries.push({
      id: `task:${task.id}`,
      source: 'task',
      title: task.title,
      startsAt,
      endsAt: null,
      isAllDay: true,
      status,
      projectId: task.projectId,
    });
  }

  return entries.sort((left, right) => left.startsAt - right.startsAt);
};

const TASK_STATE: Record<AgendaStatus, CalendarEntryState> = {
  upcoming: 'todo',
  active: 'doing',
  complete: 'done',
};

function eventStateAt(entry: CalendarEntry, now: number): CalendarEntryState {
  if (entry.isAllDay) {
    if (now < startOfDay(new Date(entry.startsAt))) return 'upcoming';
    const lastDay = new Date(Math.max(entry.startsAt, entry.endsAt ?? entry.startsAt));
    return now > endOfDay(lastDay) ? 'ended' : 'today';
  }
  if (now < entry.startsAt) return 'upcoming';
  const endsAt = entry.endsAt && entry.endsAt > entry.startsAt ? entry.endsAt : entry.startsAt + CALENDAR_OPEN_EVENT_MS;
  return now < endsAt ? 'ongoing' : 'ended';
}

export function calendarEntryState(entry: CalendarEntry, now: number): CalendarEntryState {
  if (entry.source === 'task') return TASK_STATE[entry.status];
  if (entry.source === 'reminder') {
    if (entry.status === 'complete') return 'done';
    return now < entry.startsAt ? 'upcoming' : 'overdue';
  }
  return eventStateAt(entry, now);
}

export const calendarMonths = (anchor: Date): Date[] =>
  [-1, 0, 1].map((offset) => new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1));

export const calendarWindow = (anchor: Date): Range => ({
  from: calendarMonthRange(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)).from,
  to: calendarMonthRange(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1)).to,
});

export function projectCalendar(input: CalendarProjectionInput, anchor: Date): ViewWrite[] {
  return calendarMonths(anchor).map((month) => {
    const range = calendarMonthRange(month);
    return {
      key: VIEW_CACHE_KEYS.calendarEntries,
      scope: calendarMonthScope(month),
      rows: toCalendarEntries(input.events, input.reminders, input.tasks, range.from, range.to),
      limit: VIEW_CACHE_CALENDAR_ENTRY_LIMIT,
    };
  });
}

export const todayRange = (now: Date): Range => ({ from: startOfDay(now), to: endOfDay(now) });

export function projectAgenda(input: CalendarProjectionInput, { now }: ProjectionContext): ViewWrite[] {
  const { from, to } = todayRange(now);
  return [
    {
      key: VIEW_CACHE_KEYS.dashboardAgenda,
      scope: 'today',
      rows: toCalendarEntries(input.events, input.reminders, input.tasks, from, to),
      limit: VIEW_CACHE_CALENDAR_ENTRY_LIMIT,
    },
  ];
}

export const agendaScope = (anchor: Date): string => String(startOfDay(anchor));

export const agendaSpan = (scope: string, { weeks }: AgendaWindow): Range => {
  const first = new Date(Number(scope));
  return { from: startOfDay(first), to: endOfDay(addDays(first, weeks * 7 - 1)) };
};

export type AgendaFeedInput = CalendarProjectionInput & {
  eventsLater: boolean;
  tasksLater: boolean;
};

export function projectAgendaFeed(input: AgendaFeedInput, scope: string, range: Range): ViewWrite[] {
  const remindersLater = input.reminders.some((reminder) => reminder.scheduledAt.getTime() > range.to);
  const value: AgendaFeed = {
    rows: toCalendarEntries(input.events, input.reminders, input.tasks, range.from, range.to),
    hasMore: input.eventsLater || input.tasksLater || remindersLater,
    from: range.from,
    to: range.to,
  };
  return [{ key: VIEW_CACHE_KEYS.calendarAgenda, scope, value }];
}
