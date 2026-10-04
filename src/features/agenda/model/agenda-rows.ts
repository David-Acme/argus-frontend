import type { CalendarEntry, CalendarSource } from '@/core/types';

export type AgendaRow =
  | { kind: 'month'; key: string; month: number }
  | { kind: 'day'; key: string; day: number; isToday: boolean; entries: readonly CalendarEntry[] }
  | { kind: 'free'; key: string; from: number; to: number; days: number };

export type AgendaRange = { from: number; to: number };

export type DayMath = {
  startOfDay: (value: Date) => Date;
  addDays: (value: Date, amount: number) => Date;
  isSameMonth: (left: Date, right: Date) => boolean;
};

export type AgendaSummary = {
  counts: Readonly<Record<CalendarSource, number>>;
  busyDays: number;
  freeDays: number;
  next: CalendarEntry | null;
};

function byDay(entries: readonly CalendarEntry[], days: DayMath): Map<number, CalendarEntry[]> {
  const grouped = new Map<number, CalendarEntry[]>();
  for (const entry of entries) {
    const key = days.startOfDay(new Date(entry.startsAt)).getTime();
    const list = grouped.get(key);
    if (list) list.push(entry);
    else grouped.set(key, [entry]);
  }
  return grouped;
}

function compareInDay(left: CalendarEntry, right: CalendarEntry): number {
  if (left.isAllDay !== right.isAllDay) return left.isAllDay ? -1 : 1;
  return left.startsAt - right.startsAt || left.title.localeCompare(right.title);
}

export function agendaRows(
  entries: readonly CalendarEntry[],
  range: AgendaRange,
  now: number,
  days: DayMath
): AgendaRow[] {
  const grouped = byDay(entries, days);
  const today = days.startOfDay(new Date(now)).getTime();
  const rows: AgendaRow[] = [];
  let free: { from: number; to: number; days: number } | null = null;
  let previous: Date | null = null;

  const closeFree = () => {
    if (!free) return;
    rows.push({ kind: 'free', key: `f:${free.from}`, ...free });
    free = null;
  };

  for (let day = days.startOfDay(new Date(range.from)); day.getTime() <= range.to; day = days.addDays(day, 1)) {
    const key = day.getTime();
    if (previous && !days.isSameMonth(previous, day)) {
      closeFree();
      rows.push({ kind: 'month', key: `m:${key}`, month: key });
    }
    previous = day;
    const dayEntries = grouped.get(key);
    const isToday = key === today;
    if (!dayEntries && !isToday) {
      if (free) free = { from: free.from, to: key, days: free.days + 1 };
      else free = { from: key, to: key, days: 1 };
      continue;
    }
    closeFree();
    rows.push({
      kind: 'day',
      key: `d:${key}`,
      day: key,
      isToday,
      entries: dayEntries ? [...dayEntries].sort(compareInDay) : [],
    });
  }
  closeFree();
  return rows;
}

export function agendaSummary(
  entries: readonly CalendarEntry[],
  range: AgendaRange,
  now: number,
  days: DayMath
): AgendaSummary {
  const counts: Record<CalendarSource, number> = { event: 0, task: 0, reminder: 0 };
  const busy = new Set<number>();
  let next: CalendarEntry | null = null;
  const today = days.startOfDay(new Date(now)).getTime();

  for (const entry of entries) {
    if (entry.startsAt < range.from || entry.startsAt > range.to) continue;
    counts[entry.source] += 1;
    busy.add(days.startOfDay(new Date(entry.startsAt)).getTime());
    if (entry.status === 'complete') continue;
    const upcoming = entry.isAllDay
      ? days.startOfDay(new Date(entry.startsAt)).getTime() >= today
      : (entry.endsAt ?? entry.startsAt) >= now;
    if (upcoming && (!next || entry.startsAt < next.startsAt)) next = entry;
  }

  let total = 0;
  for (let day = days.startOfDay(new Date(range.from)); day.getTime() <= range.to; day = days.addDays(day, 1)) {
    total += 1;
  }

  return { counts, busyDays: busy.size, freeDays: Math.max(0, total - busy.size), next };
}
