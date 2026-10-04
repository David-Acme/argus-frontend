import { describe, expect, test } from 'bun:test';
import type { CalendarEntry } from '@/core/types';
import { agendaRows as rowsWith, agendaSummary as summaryWith } from '@/features/agenda/model/agenda-rows';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';

const days = createDateFormatter('es', {
  languageTag: 'es-ES',
  regionCode: 'ES',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: 'Europe/Madrid',
});
type Range = { from: number; to: number };

const agendaRows = (entries: CalendarEntry[], range: Range, now: number) => rowsWith(entries, range, now, days);
const agendaSummary = (entries: CalendarEntry[], range: Range, now: number) =>
  summaryWith(entries, range, now, days);

const day = (month: number, date: number, hour = 0, minute = 0) =>
  new Date(2026, month, date, hour, minute).getTime();

function entry(id: string, startsAt: number, extra: Partial<CalendarEntry> = {}): CalendarEntry {
  return {
    id,
    source: 'event',
    title: id,
    startsAt,
    endsAt: null,
    isAllDay: false,
    status: 'upcoming',
    ...extra,
  };
}

const range = (from: number, to: number) => ({ from, to: new Date(to).setHours(23, 59, 59, 999) });

describe('agendaRows', () => {
  test('empty days collapse into one run and today always shows', () => {
    const rows = agendaRows([entry('a', day(9, 6, 9))], range(day(9, 3), day(9, 12)), day(9, 3, 10));
    expect(rows.map((row) => row.kind)).toEqual(['day', 'free', 'day', 'free']);
    const [today, before, busy, after] = rows;
    expect(today).toMatchObject({ kind: 'day', isToday: true, entries: [] });
    expect(before).toMatchObject({ kind: 'free', from: day(9, 4), to: day(9, 5), days: 2 });
    expect(busy).toMatchObject({ kind: 'day', day: day(9, 6), isToday: false });
    expect(after).toMatchObject({ kind: 'free', from: day(9, 7), to: day(9, 12), days: 6 });
  });

  test('a run never crosses into another month, which gets its own label', () => {
    const rows = agendaRows([], range(day(9, 29), day(10, 2)), day(8, 1));
    expect(rows).toEqual([
      { kind: 'free', key: `f:${day(9, 29)}`, from: day(9, 29), to: day(9, 31), days: 3 },
      { kind: 'month', key: `m:${day(10, 1)}`, month: day(10, 1) },
      { kind: 'free', key: `f:${day(10, 1)}`, from: day(10, 1), to: day(10, 2), days: 2 },
    ]);
  });

  test('a day lists all-day entries first, then by time', () => {
    const rows = agendaRows(
      [
        entry('late', day(9, 5, 18)),
        entry('early', day(9, 5, 8)),
        entry('all', day(9, 5), { isAllDay: true }),
      ],
      range(day(9, 5), day(9, 5)),
      day(9, 1)
    );
    expect(rows).toHaveLength(1);
    const [only] = rows;
    expect(only?.kind === 'day' ? only.entries.map((item) => item.id) : []).toEqual(['all', 'early', 'late']);
  });

  test('entries outside the range never create rows', () => {
    const rows = agendaRows([entry('outside', day(9, 20, 9))], range(day(9, 3), day(9, 4)), day(9, 3));
    expect(rows.map((row) => row.kind)).toEqual(['day', 'free']);
  });
});

describe('agendaSummary', () => {
  test('counts by source, busy and free days, and the next thing still to come', () => {
    const now = day(9, 3, 12);
    const summary = agendaSummary(
      [
        entry('past', day(9, 3, 8), { endsAt: day(9, 3, 9) }),
        entry('running', day(9, 3, 11), { endsAt: day(9, 3, 13), source: 'reminder' }),
        entry('later', day(9, 4, 9), { source: 'task' }),
        entry('done', day(9, 3, 15), { status: 'complete' }),
        entry('outside', day(9, 30, 9)),
      ],
      range(day(9, 3), day(9, 9)),
      now
    );
    expect(summary.counts).toEqual({ event: 2, reminder: 1, task: 1 });
    expect(summary.busyDays).toBe(2);
    expect(summary.freeDays).toBe(5);
    expect(summary.next?.id).toBe('running');
  });

  test("today's all-day entry is still ahead; nothing left means no next", () => {
    const now = day(9, 3, 22);
    expect(agendaSummary([entry('all', day(9, 3), { isAllDay: true })], range(day(9, 3), day(9, 3)), now).next?.id).toBe('all');
    expect(agendaSummary([entry('gone', day(9, 3, 8))], range(day(9, 3), day(9, 3)), now).next).toBeNull();
  });
});
