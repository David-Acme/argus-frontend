import { useEffect, useMemo } from 'react';
import { agendaScope, calendarMonthScope } from '@/core/services/view-cache';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import type { AgendaFeed, CalendarEntry, CalendarView } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import {
  useInfiniteList,
  usePagedView,
  type InfiniteListState,
} from '@/shared/hooks/use-infinite-list';
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
  listRange: { from: number; to: number };
  entries: readonly CalendarEntry[];
  monthEntries: readonly CalendarEntry[];
  selectedDayEntries: readonly CalendarEntry[];
  agendaPaging: InfiniteListState;
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
  const agenda = usePagedView<CalendarEntry, AgendaFeed>(
    VIEW_CACHE_KEYS.calendarAgenda,
    agendaScope(anchor),
    view === 'agenda'
  );
  const agendaFeed = agenda.snapshot;
  const agendaPaging = useInfiniteList({
    count: agendaFeed?.to ?? 0,
    hasMore: agenda.hasMore,
    loadMore: agenda.loadMore,
  });
  const cached = useMemo(
    () => (view === 'agenda' ? mergeById(current, following) : current),
    [current, following, view]
  );
  const { rows: monthRows } = useOptimisticRows(cached, CALENDAR_LENSES, byStart);
  const { rows: agendaRows } = useOptimisticRows(agenda.rows, CALENDAR_LENSES, byStart);
  const fromFeed = view === 'agenda' && agendaFeed != null;
  const listRange = useMemo(
    () => (fromFeed && agendaFeed ? { from: agendaFeed.from, to: agendaFeed.to } : range),
    [agendaFeed, fromFeed, range]
  );
  const listRows = fromFeed ? agendaRows : monthRows;
  const entries = useMemo(
    () =>
      listRows.filter(
        (entry) => entry.startsAt >= listRange.from && entry.startsAt <= listRange.to
      ),
    [listRange.from, listRange.to, listRows]
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

  return { range, listRange, entries, monthEntries: monthRows, selectedDayEntries, agendaPaging };
}
