import type { AgendaItem, CalendarEntry, DashboardProjectCard, DayRange } from '@/core/types';
import { calendarMonthScope } from '@/core/services/view-cache';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useAgendaActions, type AgendaActions } from '@/features/home/hooks/use-agenda-actions';
import {
  agendaItems,
  byStart,
  CALENDAR_LENSES,
  projectNamesOf,
  useReminders,
} from '@/features/agenda';
import type { WordingContext } from '@/features/home/model/agenda-wording';

export type Agenda = {
  visible: boolean;
  synced: boolean;
  items: readonly AgendaItem[];
  today: DayRange;
  tomorrow: DayRange;
  wording: WordingContext;
  actions: AgendaActions;
};

const MINUTE_MS = 60_000;

const NONE: readonly never[] = [];

export function useAgenda(): Agenda {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const now = useNow(MINUTE_MS);
  const { has } = useCapabilities();
  const readsReminders = has(CAPABILITY.remindersRead);
  const readsAgenda = has(CAPABILITY.agendaRead);
  const reminders = useReminders();
  const actions = useAgendaActions();
  const start = date.startOfDay(new Date(now));
  const next = date.addDays(start, 1);
  const today = { from: start.getTime(), to: date.endOfDay(start).getTime() };
  const tomorrow = { from: next.getTime(), to: date.endOfDay(next).getTime() };
  const todayCached = useViewCacheRows<CalendarEntry>(VIEW_CACHE_KEYS.dashboardAgenda, 'today');
  const monthCached = useViewCacheRows<CalendarEntry>(
    VIEW_CACHE_KEYS.calendarEntries,
    calendarMonthScope(next)
  );
  const { rows: todayEntries } = useOptimisticRows(todayCached, CALENDAR_LENSES, byStart);
  const { rows: monthEntries } = useOptimisticRows(monthCached, CALENDAR_LENSES, byStart);
  const projects = useViewCacheRows<DashboardProjectCard>(VIEW_CACHE_KEYS.dashboardProjects);
  const synced = useViewCacheValue<boolean>(VIEW_CACHE_KEYS.syncReady) === true;
  const entries = readsAgenda
    ? [
        ...todayEntries,
        ...monthEntries.filter(
          (entry) => entry.startsAt >= tomorrow.from && entry.startsAt <= tomorrow.to
        ),
      ]
    : NONE;
  const items = agendaItems({
    reminders: readsReminders ? reminders.rows : NONE,
    entries,
    projectNames: projectNamesOf(projects),
  });

  return {
    visible: readsReminders || readsAgenda,
    synced,
    items,
    today,
    tomorrow,
    wording: { now, date, t },
    actions,
  };
}
