import { useEffect, useMemo } from 'react';
import { calendarMonthScope } from '@/core/services/view-cache';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import type { CalendarEntry, CalendarView } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { compareDayEntries } from '@/features/agenda/model/calendar-entry-actions';
import { byStart, CALENDAR_LENSES } from '@/features/agenda/model/calendar-optimistic';

type AgendaEntriesInput = {
  view: CalendarView;
  anchor: Date;
  selectedDay: Date;
};

type AgendaEntries = {
  range: { from: number; to: number };
  entries: readonly CalendarEntry[];
  monthEntries: readonly CalendarEntry[];
  selectedDayEntries: readonly CalendarEntry[];
};

function mergeById(
  first: readonly CalendarEntry[],
  second: readonly CalendarEntry[]
): readonly CalendarEntry[] {
  if (second.length === 0) return first;
  const seen = new Set(first.map((entry) => entry.id));
  const extra = second.filter((entry) => !seen.has(entry.id));
  return extra.length === 0 ? first : [...first, ...extra];
}

export function useAgendaEntries({ view, anchor, selectedDay }: AgendaEntriesInput): AgendaEntries {
  const date = useDateFormatter();
  const range = useMemo(() => date.rangeFor(view, anchor), [anchor, date, view]);
  const nextMonth = useMemo(() => date.addMonths(anchor, 1), [anchor, date]);
  const current = useViewCacheRows<CalendarEntry>(
    VIEW_CACHE_KEYS.calendarEntries,
    calendarMonthScope(anchor)
  );
  const following = useViewCacheRows<CalendarEntry>(
    VIEW_CACHE_KEYS.calendarEntries,
    calendarMonthScope(nextMonth)
  );
  const cached = useMemo(
    () => (view === 'agenda' ? mergeById(current, following) : current),
    [current, following, view]
  );
  const { rows } = useOptimisticRows(cached, CALENDAR_LENSES, byStart);
  const entries = useMemo(
    () => rows.filter((entry) => entry.startsAt >= range.from && entry.startsAt <= range.to),
    [range.from, range.to, rows]
  );
  const selectedDayEntries = useMemo(
    () =>
      entries
        .filter((entry) => date.sameDay(new Date(entry.startsAt), selectedDay))
        .sort(compareDayEntries),
    [date, entries, selectedDay]
  );

  useEffect(() => {
    viewCacheCoordinatorService.watchCalendarMonth(anchor);
  }, [anchor]);

  return { range, entries, monthEntries: rows, selectedDayEntries };
}
