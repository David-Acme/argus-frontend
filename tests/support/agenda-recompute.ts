import type { ICalendarEventCacheSource } from '@/core/interfaces';
import { agendaScope, agendaSpan, projectAgendaFeed } from '@/core/services/view-cache/calendar.projection';
import { AGENDA_FEED_INITIAL_WEEKS, AGENDA_FEED_STEP_WEEKS } from '@/shared/constants/cache.constant';
import { deviceTimeZone } from '@/shared/hooks/use-date-formatter/date';

export const MIXED_RULES = ['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=WEEKLY;INTERVAL=2', 'FREQ=MONTHLY', 'FREQ=YEARLY'];

export const RECOMPUTE_WEEKS =
  AGENDA_FEED_INITIAL_WEEKS + Math.ceil((2 * 52 - AGENDA_FEED_INITIAL_WEEKS) / AGENDA_FEED_STEP_WEEKS) * AGENDA_FEED_STEP_WEEKS;

export const twentySeries = (ruleOf: (index: number) => string): ICalendarEventCacheSource[] =>
  Array.from({ length: 20 }, (_, index) => ({
    id: `s${index}`,
    ownerId: '1',
    title: `Series ${index}`,
    startsAt: new Date(2026, 8, 1 + (index % 7), 6 + (index % 12), 15),
    endsAt: null,
    isAllDay: false,
    color: '',
    location: '',
    description: '',
    projectId: null,
    recurrenceRule: ruleOf(index),
  }));

export const otherHouseholdZone = (): string =>
  deviceTimeZone() === 'Europe/Madrid' ? 'America/New_York' : 'Europe/Madrid';

export type RecomputeInput = {
  series: readonly ICalendarEventCacheSource[];
  zone: string | null;
  runs: number;
};

export function recomputeMedianMs({ series, zone, runs }: RecomputeInput): number {
  const scope = agendaScope(new Date(2026, 9, 1));
  const span = agendaSpan(scope, { weeks: RECOMPUTE_WEEKS });
  const input = { events: [], reminders: [], tasks: [], series, zone, eventsLater: false, tasksLater: false };
  projectAgendaFeed(input, scope, span);
  const times = Array.from({ length: runs }, () => {
    const started = performance.now();
    projectAgendaFeed(input, scope, span);
    return performance.now() - started;
  }).sort((left, right) => left - right);
  return times[Math.floor(runs / 2)] ?? Number.POSITIVE_INFINITY;
}
