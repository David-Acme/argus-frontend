import { useEffect } from 'react';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { calendarMonthScope } from '@/core/services/view-cache';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { useAuthStore } from '@/core/stores';
import type { AgendaItem, CalendarEntry, DashboardProjectCard } from '@/core/types';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { personFullName } from '@/shared/libs/sharing';
import { useReminders } from '@/features/agenda/hooks/use-reminders';
import { agendaItems, projectNamesOf } from '@/features/agenda/model/agenda-items';
import { monthOf } from '@/features/agenda/model/agenda-days';
import { byStart, CALENDAR_LENSES } from '@/features/agenda/model/calendar-optimistic';

export type AgendaPlan = {
  visible: boolean;
  items: readonly AgendaItem[];
  now: number;
  viewer: string;
  owners: ReadonlyMap<string, string>;
  projects: readonly DashboardProjectCard[];
};

const MINUTE_MS = 60_000;

const NONE: readonly never[] = [];

function mergeById(
  first: readonly CalendarEntry[],
  second: readonly CalendarEntry[]
): CalendarEntry[] {
  const seen = new Set(first.map((entry) => entry.id));
  return [...first, ...second.filter((entry) => !seen.has(entry.id))];
}

const ownersOf = (people: readonly IPeopleDirectoryCacheRow[]): ReadonlyMap<string, string> =>
  new Map(people.map((person) => [person.id, personFullName(person)]));

export function useAgendaPlan(selected: number): AgendaPlan {
  const date = useDateFormatter();
  const now = useNow(MINUTE_MS);
  const { has } = useCapabilities();
  const reminders = useReminders();
  const viewer = String(useAuthStore((state) => state.user?.id ?? ''));
  const month = monthOf(selected);
  const next = date.addMonths(new Date(month), 1);
  const current = useViewCacheRows<CalendarEntry>(
    VIEW_CACHE_KEYS.calendarEntries,
    calendarMonthScope(new Date(month))
  );
  const following = useViewCacheRows<CalendarEntry>(
    VIEW_CACHE_KEYS.calendarEntries,
    calendarMonthScope(next)
  );
  const { rows: entries } = useOptimisticRows(
    mergeById(current, following),
    CALENDAR_LENSES,
    byStart
  );
  const projects = useViewCacheRows<DashboardProjectCard>(VIEW_CACHE_KEYS.dashboardProjects);
  const people = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const readsReminders = has(CAPABILITY.remindersRead);
  const readsAgenda = has(CAPABILITY.agendaRead);
  const items = agendaItems({
    reminders: readsReminders ? reminders.rows : NONE,
    entries: readsAgenda ? entries : NONE,
    projectNames: projectNamesOf(projects),
  });

  useEffect(() => {
    viewCacheCoordinatorService.watchCalendarMonth(new Date(month));
  }, [month]);

  return {
    visible: readsReminders || readsAgenda,
    items,
    now,
    viewer,
    owners: ownersOf(people),
    projects: readsAgenda ? projects : NONE,
  };
}
