import type { ICalendarEventCacheSource } from '@/core/interfaces';
import { toCalendarEntries } from '@/core/services/view-cache/calendar.projection';
import { deviceTimeZone } from '@/shared/hooks/use-date-formatter/date';

export const MIXED_RULES = ['FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=WEEKLY;INTERVAL=2', 'FREQ=MONTHLY', 'FREQ=YEARLY'];

export const RECOMPUTE_WEEKS = 105;

const WEEK_MS = 7 * 86_400_000;

export const recomputeSpan = (weeks: number) => {
  const from = new Date(2026, 9, 1).getTime();
  return { from, to: from + weeks * WEEK_MS - 1 };
};

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
  const span = recomputeSpan(RECOMPUTE_WEEKS);
  const input = { events: [], reminders: [], tasks: [], series, zone };
  toCalendarEntries(input, span);
  const times = Array.from({ length: runs }, () => {
    const started = performance.now();
    toCalendarEntries(input, span);
    return performance.now() - started;
  }).sort((left, right) => left - right);
  return times[Math.floor(runs / 2)] ?? Number.POSITIVE_INFINITY;
}
