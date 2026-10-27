import type { AgendaItem, DayRange } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { FREE_SLOT_RULES } from '@/shared/constants';
import { isOverdue } from '@/features/agenda/model/agenda-items';
import { dayTimeline } from '@/features/agenda/model/agenda-timeline';
import type { TimelineEntry } from '@/features/agenda/model/agenda-timeline';
import { UPCOMING_DAYS } from '@/features/agenda/constants/agenda.constant';

export type DayMath = Pick<
  DateFormatter,
  | 'startOfDay'
  | 'endOfDay'
  | 'addDays'
  | 'addMonths'
  | 'sameDay'
  | 'weekDays'
  | 'monthGridDays'
  | 'isSameMonth'
>;

export type DayCell = { at: number; today: boolean; selected: boolean; marked: boolean };

export type MonthCell = DayCell & { inMonth: boolean };

export type DayGroup = {
  at: number;
  range: DayRange;
  entries: TimelineEntry[];
  overdue: number;
};

export type DayRelation = 'today' | 'tomorrow' | 'other';

export type CalendarInput = { selected: number; now: number; marks: ReadonlySet<number> };

export type GroupInput = {
  items: readonly AgendaItem[];
  from: number;
  days: number;
  now: number;
};

export function dayRange(at: number, date: Pick<DayMath, 'startOfDay' | 'endOfDay'>): DayRange {
  const day = new Date(at);
  return { from: date.startOfDay(day).getTime(), to: date.endOfDay(day).getTime() };
}

export function markedDays(
  items: readonly AgendaItem[],
  date: Pick<DayMath, 'startOfDay'>
): ReadonlySet<number> {
  return new Set(items.map((item) => date.startOfDay(new Date(item.startsAt)).getTime()));
}

function cellOf(day: Date, { selected, now, marks }: CalendarInput, date: DayMath): DayCell {
  const at = day.getTime();
  return {
    at,
    today: date.sameDay(day, new Date(now)),
    selected: date.sameDay(day, new Date(selected)),
    marked: marks.has(date.startOfDay(day).getTime()),
  };
}

export function weekCells(input: CalendarInput, date: DayMath): DayCell[] {
  return date.weekDays(new Date(input.selected)).map((day) => cellOf(day, input, date));
}

export function monthCells(month: number, input: CalendarInput, date: DayMath): MonthCell[] {
  const shown = new Date(month);
  return date.monthGridDays(shown).map((day) => ({
    ...cellOf(day, input, date),
    inMonth: date.isSameMonth(day, shown),
  }));
}

export function dayRelation(
  at: number,
  now: number,
  date: Pick<DayMath, 'sameDay' | 'addDays'>
): DayRelation {
  const today = new Date(now);
  if (date.sameDay(new Date(at), today)) return 'today';
  return date.sameDay(new Date(at), date.addDays(today, 1)) ? 'tomorrow' : 'other';
}

const listOrder =
  (now: number) =>
  (left: AgendaItem, right: AgendaItem): number =>
    Number(isOverdue(right, now)) - Number(isOverdue(left, now)) ||
    Number(right.allDay) - Number(left.allDay) ||
    left.startsAt - right.startsAt;

export function dayGroup(items: readonly AgendaItem[], range: DayRange, now: number): DayGroup {
  const day = items
    .filter((item) => item.startsAt >= range.from && item.startsAt <= range.to)
    .sort(listOrder(now));
  const overdue = day.filter((item) => isOverdue(item, now)).length;
  const timed = dayTimeline(
    day.filter((item) => !isOverdue(item, now)),
    { ...FREE_SLOT_RULES, after: Math.max(now, range.from) }
  );
  const late: TimelineEntry[] = day
    .filter((item) => isOverdue(item, now))
    .map((item) => ({ type: 'item', item }));
  return { at: range.from, range, entries: [...late, ...timed], overdue };
}

export function dayGroups({ items, from, days, now }: GroupInput, date: DayMath): DayGroup[] {
  return Array.from({ length: days }, (_, index) =>
    dayGroup(items, dayRange(date.addDays(new Date(from), index).getTime(), date), now)
  );
}

export const itemsOf = (group: DayGroup): AgendaItem[] =>
  group.entries.flatMap((entry) => (entry.type === 'item' ? [entry.item] : []));

export function monthOf(at: number): number {
  const day = new Date(at);
  return new Date(day.getFullYear(), day.getMonth(), 1).getTime();
}

export const shiftMonth = (month: number, step: number, date: Pick<DayMath, 'addMonths'>): number =>
  date.addMonths(new Date(monthOf(month)), step).getTime();

export type FreeGap = { id: string; from: number; to: number; before: string; after: string };

export function freeGaps(group: DayGroup): FreeGap[] {
  return group.entries.flatMap((entry, index) => {
    if (entry.type !== 'free') return [];
    const before = group.entries[index - 1];
    const after = group.entries[index + 1];
    if (before?.type !== 'item' || after?.type !== 'item') return [];
    return [
      {
        id: entry.id,
        from: entry.from,
        to: entry.to,
        before: before.item.title,
        after: after.item.title,
      },
    ];
  });
}

export function nextDays(
  { items, from, now }: Omit<GroupInput, 'days'>,
  date: DayMath
): DayGroup[] {
  const start = date.addDays(new Date(from), 1).getTime();
  return dayGroups({ items, from: start, days: UPCOMING_DAYS, now }, date);
}

export function restOfDay(
  items: readonly AgendaItem[],
  item: AgendaItem,
  date: DayMath
): AgendaItem[] {
  const { from, to } = dayRange(item.startsAt, date);
  return items
    .filter((other) => other.id !== item.id && other.startsAt >= from && other.startsAt <= to)
    .sort((left, right) => left.startsAt - right.startsAt);
}

export type AgendaEmptyInput = {
  day: boolean;
  groups: readonly Pick<DayGroup, 'entries'>[];
  items: readonly Pick<AgendaItem, 'startsAt'>[];
  range: DayRange;
};

export function agendaEmpty({ day, groups, items, range }: AgendaEmptyInput): boolean {
  if (day) return !items.some((item) => item.startsAt >= range.from && item.startsAt <= range.to);
  return (groups[0]?.entries.length ?? 0) === 0;
}
