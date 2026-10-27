import type { AgendaItem, NowList, TranslateFn } from '@/core/types';
import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { recurrenceLabel } from '@/shared/libs/recurrence';
import { isOngoing, isOverdue } from '@/features/agenda';

export type TimeToGo =
  { kind: 'now' } | { kind: 'ago' | 'in'; amount: number; unit: 'min' | 'h' | 'd' };

export type WordingDate = Pick<
  DateFormatter,
  | 'sameDay'
  | 'addDays'
  | 'formatTime'
  | 'formatTimeRange'
  | 'formatWeekdayShort'
  | 'formatDayNumber'
>;

export type WordingContext = { now: number; date: WordingDate; t: TranslateFn };

export type MetaPlace = 'now' | 'day';

export type Urgency = 'overdue' | 'now' | 'later';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const DISTANCE = {
  ago: {
    min: 'screens.home.agenda-sections.ago-min',
    h: 'screens.home.agenda-sections.ago-h',
    d: 'screens.home.agenda-sections.ago-d',
  },
  in: {
    min: 'screens.home.agenda-sections.in-min',
    h: 'screens.home.agenda-sections.in-h',
    d: 'screens.home.agenda-sections.in-d',
  },
} as const;

export function timeToGo(item: AgendaItem, now: number): TimeToGo | null {
  if (item.allDay || item.done) return null;
  if (isOngoing(item, now)) return { kind: 'now' };
  const delta = item.startsAt - now;
  const distance = Math.abs(delta);
  if (distance < MINUTE_MS) return { kind: 'now' };
  const kind = delta < 0 ? 'ago' : 'in';
  if (distance < HOUR_MS) return { kind, amount: Math.floor(distance / MINUTE_MS), unit: 'min' };
  if (distance < DAY_MS) return { kind, amount: Math.floor(distance / HOUR_MS), unit: 'h' };
  return { kind, amount: Math.floor(distance / DAY_MS), unit: 'd' };
}

export function timeToGoText(value: TimeToGo, t: TranslateFn): string {
  if (value.kind === 'now') return t('screens.home.agenda-sections.time-now');
  return t(DISTANCE[value.kind][value.unit], { count: value.amount });
}

export function urgencyOf(item: AgendaItem, now: number): Urgency {
  if (isOverdue(item, now)) return 'overdue';
  return timeToGo(item, now)?.kind === 'now' ? 'now' : 'later';
}

export function nowCount({ total, overdue }: NowList, t: TranslateFn): string | undefined {
  if (total === 0) return undefined;
  if (overdue === 0) return String(total);
  if (overdue === 1) return t('screens.home.agenda-sections.count-overdue-one', { count: total });
  return t('screens.home.agenda-sections.count-overdue', { count: total, overdue });
}

const lowerFirst = (text: string): string => text.charAt(0).toLocaleLowerCase() + text.slice(1);

const upperFirst = (text: string): string => text.charAt(0).toLocaleUpperCase() + text.slice(1);

export function dayAndTime(at: number, { now, date, t }: WordingContext): string {
  const when = new Date(at);
  const time = date.formatTime(when);
  if (date.sameDay(when, new Date(now)))
    return t('screens.home.agenda-sections.today-at', { time });
  if (date.sameDay(when, date.addDays(new Date(now), 1)))
    return t('screens.home.agenda-sections.tomorrow-at', { time });
  const day = `${upperFirst(date.formatWeekdayShort(when))} ${date.formatDayNumber(when)}`;
  return t('screens.home.agenda-sections.day-at', { day, time });
}

function timeOf(item: AgendaItem, { date, t }: WordingContext): string {
  if (item.allDay) return t('screens.home.agenda-sections.all-day');
  if (item.kind !== 'event') return date.formatTime(new Date(item.startsAt));
  return date.formatTimeRange(
    new Date(item.startsAt),
    item.endsAt === null ? null : new Date(item.endsAt)
  );
}

function whenOf(item: AgendaItem, place: MetaPlace, context: WordingContext): string {
  const { now, date, t } = context;
  if (place === 'day') return timeOf(item, context);
  if (isOverdue(item, now)) {
    const today = date.sameDay(new Date(item.startsAt), new Date(now));
    return t('screens.home.agenda-sections.overdue', {
      when: today ? timeOf(item, context) : dayAndTime(item.startsAt, context),
    });
  }
  if (item.kind !== 'event' && !item.allDay) return dayAndTime(item.startsAt, context);
  return timeOf(item, context);
}

export function itemMeta(item: AgendaItem, place: MetaPlace, context: WordingContext): string {
  const { now, t } = context;
  const repeat = recurrenceLabel(item.repeat, t);
  return [
    whenOf(item, place, context),
    place === 'day' && isOngoing(item, now) ? t('screens.home.agenda-sections.ongoing') : null,
    repeat ? lowerFirst(repeat) : null,
    place === 'now' ? item.project : null,
    place === 'now' ? item.place : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
