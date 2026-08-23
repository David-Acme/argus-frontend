import type {
  ICalendarEventCacheSource,
  IProjectTaskCalendarCacheSource,
  IReminderCacheSource,
} from '@/core/interfaces';
import type { AgendaStatus, CalendarEntry } from '@/core/types';
import { VIEW_CACHE_CALENDAR_MONTH_DAYS } from '@/shared/constants/cache.constant';

const DAY_MS = 86_400_000;

export const calendarMonthScope = (value: Date): string =>
  `month.${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

/**
 * Covers every locale-specific six-week month grid. The screen still narrows
 * the snapshot to its precise day/week/month range before rendering it.
 */
export const calendarMonthRange = (value: Date): { from: number; to: number } => {
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  first.setDate(first.getDate() - first.getDay());
  const from = new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime();
  return { from, to: from + VIEW_CACHE_CALENDAR_MONTH_DAYS * DAY_MS - 1 };
};

export const toCalendarEntries = (
  events: readonly ICalendarEventCacheSource[],
  reminders: readonly IReminderCacheSource[],
  tasks: readonly IProjectTaskCalendarCacheSource[],
  from: number,
  to: number,
): CalendarEntry[] => {
  const entries: CalendarEntry[] = [];

  for (const event of events) {
    entries.push({
      id: `event:${event.id}`,
      source: 'event',
      title: event.title,
      startsAt: event.startsAt.getTime(),
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
