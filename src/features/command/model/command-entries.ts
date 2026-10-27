import type {
  ICameraCacheRow,
  IEventListCacheRow,
  IPeopleDirectoryCacheRow,
  IProjectCacheRow,
  IProjectTaskCacheRow,
} from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { firstOccurrenceAfter, parseRecurrenceRule, zoneClock } from '@/shared/libs/recurrence';
import { foldText, type SearchEntry, type SearchKind } from './command-search';

export type SearchRows = {
  events: readonly IEventListCacheRow[];
  tasks: readonly Pick<IProjectTaskCacheRow, 'id' | 'projectId' | 'title' | 'status' | 'dueAt'>[];
  projects: readonly Pick<IProjectCacheRow, 'id' | 'name'>[];
  people: readonly Pick<IPeopleDirectoryCacheRow, 'id' | 'name' | 'lastName' | 'isActive'>[];
  cameras: readonly Pick<ICameraCacheRow, 'id' | 'name'>[];
};

type EntryFields = Omit<SearchEntry, 'folded'>;

const CLOSED_TASKS: ReadonlySet<string> = new Set(['done', 'canceled']);

const entryOf = (fields: EntryFields): SearchEntry => ({
  ...fields,
  folded: foldText(fields.title),
});

const plain = (kind: SearchKind, id: string, title: string): SearchEntry =>
  entryOf({ kind, id, title, at: null });

export function nextEventAt(event: IEventListCacheRow, now: number): number {
  const rule = parseRecurrenceRule(event.recurrenceRule);
  if (!rule || event.startsAt >= now) return event.startsAt;
  return (
    firstOccurrenceAfter({ rule, anchor: event.startsAt, moment: now, clock: zoneClock(null) }) ??
    event.startsAt
  );
}

export function searchEntries(rows: SearchRows, now: number): SearchEntry[] {
  return [
    ...rows.events.map((event) =>
      entryOf({
        kind: 'event',
        id: event.id,
        title: event.title,
        at: nextEventAt(event, now),
        allDay: event.isAllDay,
      })
    ),
    ...rows.tasks
      .filter((task) => !CLOSED_TASKS.has(task.status))
      .map((task) =>
        entryOf({
          kind: 'task',
          id: task.id,
          title: task.title,
          at: task.dueAt,
          parentId: task.projectId,
        })
      ),
    ...rows.projects.map((project) => plain('project', project.id, project.name)),
    ...rows.people
      .filter((person) => person.isActive)
      .map((person) =>
        plain('person', person.id, [person.name, person.lastName].filter(Boolean).join(' '))
      ),
    ...rows.cameras.map((camera) => plain('camera', camera.id, camera.name)),
  ];
}

type WhenFormat = Pick<DateFormatter, 'sameDay' | 'addDays' | 'formatTime' | 'formatDayMonth'>;

type WhenInput = {
  at: number;
  allDay?: boolean;
  now: number;
  date: WhenFormat;
  t: TranslateFn;
};

export function whenLabel({ at, allDay = false, now, date, t }: WhenInput): string {
  const moment = new Date(at);
  const today = new Date(now);
  const day = date.sameDay(moment, today)
    ? t('screens.command.today')
    : date.sameDay(moment, date.addDays(today, 1))
      ? t('screens.command.tomorrow')
      : date.formatDayMonth(moment);
  return allDay ? day : t('screens.command.when', { day, time: date.formatTime(moment) });
}
