import type { ISearchHitCacheRow } from '@/core/interfaces';
import type { TranslateFn } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { firstOccurrenceAfter, parseRecurrenceRule, zoneClock } from '@/shared/libs/recurrence';
import type { SearchEntry } from './command-search';

export type EventTiming = { startsAt: number; recurrenceRule: string | null };

export function nextEventAt(event: EventTiming, now: number): number {
  const rule = parseRecurrenceRule(event.recurrenceRule);
  if (!rule || event.startsAt >= now) return event.startsAt;
  return (
    firstOccurrenceAfter({ rule, anchor: event.startsAt, moment: now, clock: zoneClock(null) }) ??
    event.startsAt
  );
}

function entryAt(hit: ISearchHitCacheRow, now: number): number | null {
  if (hit.kind !== 'event' || hit.at === null) return hit.at;
  return nextEventAt({ startsAt: hit.at, recurrenceRule: hit.recurrenceRule }, now);
}

export function searchEntries(hits: readonly ISearchHitCacheRow[], now: number): SearchEntry[] {
  return hits.map((hit) => ({
    kind: hit.kind,
    id: hit.id,
    title: hit.title,
    at: entryAt(hit, now),
    allDay: hit.allDay,
    parentId: hit.parentId ?? undefined,
  }));
}

type WhenFormat = Pick<DateFormatter, 'sameDay' | 'addDays' | 'formatTime' | 'formatDayMonth'>;

type WhenInput = {
  at: number;
  allDay?: boolean;
  now: number;
  date: WhenFormat;
  t: TranslateFn;
};

export function whenLabel({ at, allDay = false, now, date, t }: WhenInput): string {
  const moment = new Date(at);
  const today = new Date(now);
  const day = date.sameDay(moment, today)
    ? t('screens.command.today')
    : date.sameDay(moment, date.addDays(today, 1))
      ? t('screens.command.tomorrow')
      : date.formatDayMonth(moment);
  return allDay ? day : t('screens.command.when', { day, time: date.formatTime(moment) });
}
