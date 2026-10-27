import type { AgendaItem, CalendarEntry, DayRange, NowList } from '@/core/types';
import { CALENDAR_OPEN_EVENT_MS } from '@/shared/constants';

export type AgendaSources = {
  entries: readonly CalendarEntry[];
  projectNames: ReadonlyMap<string, string>;
};

export const NOW_ROWS = 3;

const STACK_ROWS = 3;

const COLUMN_ROWS = 5;

export const listLimit = (column: boolean): number => (column ? COLUMN_ROWS : STACK_ROWS);

const fromEntry =
  (projectNames: ReadonlyMap<string, string>) =>
  (entry: CalendarEntry): AgendaItem => ({
    id: entry.id,
    kind: entry.source === 'task' ? 'task' : 'event',
    title: entry.title,
    startsAt: entry.startsAt,
    endsAt: entry.endsAt,
    allDay: entry.isAllDay,
    done: entry.source === 'task' && entry.status === 'complete',
    started: entry.source === 'task' && entry.status === 'active',
    repeat: entry.series?.rule ?? null,
    place: entry.location || null,
    project: entry.projectId ? (projectNames.get(entry.projectId) ?? null) : null,
    entry,
  });

const byTime = (left: AgendaItem, right: AgendaItem): number =>
  Number(right.allDay) - Number(left.allDay) || left.startsAt - right.startsAt;

export function agendaItems({ entries, projectNames }: AgendaSources): AgendaItem[] {
  return entries.map(fromEntry(projectNames)).sort(byTime);
}

export const itemEnd = (item: AgendaItem): number =>
  item.endsAt !== null && item.endsAt > item.startsAt
    ? item.endsAt
    : item.startsAt + CALENDAR_OPEN_EVENT_MS;

export const isOngoing = (item: AgendaItem, now: number): boolean =>
  item.kind === 'event' && !item.allDay && item.startsAt <= now && now < itemEnd(item);

export const isOverdue = (item: AgendaItem, now: number): boolean =>
  !item.done && !item.allDay && item.kind !== 'event' && item.startsAt < now;

export const within = (item: AgendaItem, { from, to }: DayRange): boolean =>
  item.startsAt >= from && item.startsAt <= to;

const isDue = (item: AgendaItem, now: number, today: DayRange): boolean => {
  if (item.done || item.startsAt > today.to) return false;
  if (item.allDay) return item.startsAt >= today.from;
  return item.kind !== 'event' || itemEnd(item) > now;
};

const nowOrder = (now: number) => (left: AgendaItem, right: AgendaItem) =>
  Number(isOverdue(right, now)) - Number(isOverdue(left, now)) ||
  Number(left.allDay) - Number(right.allDay) ||
  left.startsAt - right.startsAt;

export function nowList(items: readonly AgendaItem[], now: number, today: DayRange): NowList {
  const due = items.filter((item) => isDue(item, now, today)).sort(nowOrder(now));
  return {
    items: due.slice(0, NOW_ROWS),
    total: due.length,
    overdue: due.filter((item) => isOverdue(item, now)).length,
  };
}

export const dayList = (items: readonly AgendaItem[], day: DayRange): AgendaItem[] =>
  items.filter((item) => within(item, day));

export const projectNamesOf = (
  projects: readonly { id: string; name: string }[]
): ReadonlyMap<string, string> => new Map(projects.map((project) => [project.id, project.name]));
