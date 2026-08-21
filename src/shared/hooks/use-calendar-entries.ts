import { useMemo } from 'react';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { projectTaskService } from '@/core/services/project-task.service';
import { reminderService } from '@/core/services/reminder.service';
import type { AgendaStatus, CalendarEntry } from '@/core/types';
import { useObservableReady } from './use-observable';

type UseCalendarEntriesInput = {
  from: number;
  to: number;
  userId: string;
};

type UseCalendarEntriesResult = {
  entries: CalendarEntry[];
  /** `true` once every table answered, so an empty list really is empty. */
  ready: boolean;
};

/**
 * Merges the three local tables that carry a date into one list. The merge is
 * display-only and lives here on purpose: the backend keeps calendar events,
 * reminders and tasks separate, and the calendar is the only place they share
 * a screen.
 */
export function useCalendarEntries({
  from,
  to,
  userId,
}: UseCalendarEntriesInput): UseCalendarEntriesResult {
  const [events, eventsReady] = useObservableReady(
    () => calendarEventService.observeRange(from, to),
    [],
    [from, to],
  );
  const [reminders, remindersReady] = useObservableReady(
    () => reminderService.observeForUser(userId),
    [],
    [userId],
  );
  const [tasks, tasksReady] = useObservableReady(
    () => projectTaskService.observeDueRange(from, to),
    [],
    [from, to],
  );
  const ready = eventsReady && remindersReady && tasksReady;

  const entries = useMemo(() => {
    const merged: CalendarEntry[] = [];

    for (const event of events) {
      merged.push({
        id: `event:${event.id}`,
        source: 'event',
        title: event.title,
        startsAt: event.startsAt.getTime(),
        endsAt: event.endsAt ? event.endsAt.getTime() : null,
        isAllDay: event.isAllDay,
        status: 'upcoming',
        color: event.color || undefined,
        location: event.location || undefined,
        projectId: event.projectId,
      });
    }

    for (const reminder of reminders) {
      const startsAt = reminder.scheduledAt.getTime();
      if (startsAt < from || startsAt > to) continue;
      merged.push({
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
      const status: AgendaStatus =
        task.status === 'done' ? 'complete' : task.status === 'doing' ? 'active' : 'upcoming';
      merged.push({
        id: `task:${task.id}`,
        source: 'task',
        title: task.title,
        startsAt: task.dueAt.getTime(),
        endsAt: null,
        isAllDay: true,
        status,
        projectId: task.projectId,
      });
    }

    return merged.sort((left, right) => left.startsAt - right.startsAt);
  }, [events, reminders, tasks, from, to]);

  return { entries, ready };
}
