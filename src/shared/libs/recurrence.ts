import type { RecurrenceFrequency, RecurrenceRule, TranslateFn, WallTime, ZoneClock } from '@/core/types';
import {
  RECURRENCE_FREQUENCIES,
  RECURRENCE_INTERVAL_MAX,
  RECURRENCE_INTERVAL_MIN,
  RECURRENCE_OFFSET_CACHE_LIMIT,
  RECURRENCE_SEARCH_LIMIT,
} from '@/shared/constants';
import { deviceTimeZone, zoneWallReader, type ZoneWallReader } from '@/shared/hooks/use-date-formatter/date';

const DAY_MS = 86_400_000;
const SECOND_MS = 1_000;

type CivilDate = Pick<WallTime, 'year' | 'month' | 'day'>;

type Series = {
  rule: RecurrenceRule;
  start: WallTime;
  fraction: number;
  clock: ZoneClock;
};

export type OccurrenceInput = {
  rule: RecurrenceRule;
  anchor: number;
  index: number;
  clock: ZoneClock;
};

export type FirstOccurrenceInput = {
  rule: RecurrenceRule;
  anchor: number;
  moment: number;
  clock: ZoneClock;
};

export type OccurrenceWindowInput = {
  rule: RecurrenceRule;
  anchor: number;
  from: number;
  to: number;
  clock: ZoneClock;
  limit: number;
};

const isFrequency = (value: string): value is RecurrenceFrequency =>
  (RECURRENCE_FREQUENCIES as readonly string[]).includes(value);

function intervalOf(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= RECURRENCE_INTERVAL_MIN && parsed <= RECURRENCE_INTERVAL_MAX ? parsed : null;
}

export function parseRecurrenceRule(text: string | null | undefined): RecurrenceRule | null {
  if (!text || text.endsWith(';')) return null;
  let frequency: RecurrenceFrequency | null = null;
  let interval: number | null = null;
  for (const part of text.split(';')) {
    const equals = part.indexOf('=');
    if (equals < 0) return null;
    const key = part.slice(0, equals);
    const value = part.slice(equals + 1);
    if (key === 'FREQ' && frequency === null) {
      if (!isFrequency(value)) return null;
      frequency = value;
    } else if (key === 'INTERVAL' && interval === null) {
      interval = intervalOf(value);
      if (interval === null) return null;
    } else {
      return null;
    }
  }
  return frequency === null ? null : { frequency, interval: interval ?? RECURRENCE_INTERVAL_MIN };
}

export const formatRecurrenceRule = ({ frequency, interval }: RecurrenceRule): string =>
  interval === RECURRENCE_INTERVAL_MIN ? `FREQ=${frequency}` : `FREQ=${frequency};INTERVAL=${interval}`;

export const isRecurrenceInterval = (value: number): boolean =>
  Number.isInteger(value) && value >= RECURRENCE_INTERVAL_MIN && value <= RECURRENCE_INTERVAL_MAX;

const dayNumberOf = (date: CivilDate): number => Date.UTC(date.year, date.month - 1, date.day) / DAY_MS;

function civilFromDays(days: number): CivilDate {
  const at = new Date(days * DAY_MS);
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() };
}

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const wallAsUtc = (wall: WallTime): number =>
  Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);

const sameWall = (left: WallTime, right: WallTime): boolean =>
  left.year === right.year &&
  left.month === right.month &&
  left.day === right.day &&
  left.hour === right.hour &&
  left.minute === right.minute &&
  left.second === right.second;

const LOCAL_CLOCK: ZoneClock = {
  wallOf: (epochMs) => {
    const at = new Date(epochMs);
    return {
      year: at.getFullYear(),
      month: at.getMonth() + 1,
      day: at.getDate(),
      hour: at.getHours(),
      minute: at.getMinutes(),
      second: at.getSeconds(),
    };
  },
  epochOf: (wall) => new Date(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second).getTime(),
};

function intlClockOf(wallOf: ZoneWallReader): ZoneClock {
  const offsets = new Map<number, number>();
  const offsetAt = (epochMs: number): number => {
    const second = Math.floor(epochMs / SECOND_MS) * SECOND_MS;
    const known = offsets.get(second);
    if (known !== undefined) return known;
    const offset = wallAsUtc(wallOf(second)) - second;
    if (offsets.size >= RECURRENCE_OFFSET_CACHE_LIMIT) offsets.clear();
    offsets.set(second, offset);
    return offset;
  };
  const epochOf = (wall: WallTime): number => {
    const local = wallAsUtc(wall);
    const before = offsetAt(local - DAY_MS);
    const after = offsetAt(local + DAY_MS);
    if (before === after) return local - before;
    const matching = [local - before, local - after].filter((candidate) => sameWall(wallOf(candidate), wall));
    return matching.length > 0 ? Math.min(...matching) : local - before;
  };
  return { wallOf, epochOf };
}

const intlClocks = new Map<string, ZoneClock | null>();

export function intlZoneClock(zone: string): ZoneClock | null {
  if (!intlClocks.has(zone)) {
    const reader = zoneWallReader(zone);
    intlClocks.set(zone, reader ? intlClockOf(reader) : null);
  }
  return intlClocks.get(zone) ?? null;
}

export function zoneClock(zone: string | null | undefined): ZoneClock {
  if (!zone || zone === deviceTimeZone()) return LOCAL_CLOCK;
  return intlZoneClock(zone) ?? LOCAL_CLOCK;
}

function seriesOf(rule: RecurrenceRule, anchor: number, clock: ZoneClock): Series {
  const fraction = ((anchor % SECOND_MS) + SECOND_MS) % SECOND_MS;
  return { rule, start: clock.wallOf(anchor), fraction, clock };
}

function occurrenceOf({ rule, start, fraction, clock }: Series, index: number): number {
  const steps = index * rule.interval;
  let date: CivilDate = start;
  switch (rule.frequency) {
    case 'DAILY':
      date = civilFromDays(dayNumberOf(start) + steps);
      break;
    case 'WEEKLY':
      date = civilFromDays(dayNumberOf(start) + 7 * steps);
      break;
    case 'MONTHLY': {
      const monthIndex = start.year * 12 + (start.month - 1) + steps;
      const year = Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      date = { year, month, day: Math.min(start.day, daysInMonth(year, month)) };
      break;
    }
    case 'YEARLY': {
      const year = start.year + steps;
      date = { year, month: start.month, day: Math.min(start.day, daysInMonth(year, start.month)) };
      break;
    }
  }
  const wall: WallTime = { ...date, hour: start.hour, minute: start.minute, second: start.second };
  return clock.epochOf(wall) + fraction;
}

function estimateIndex({ rule, start, clock }: Series, moment: number): number {
  const now = clock.wallOf(moment);
  switch (rule.frequency) {
    case 'DAILY':
      return Math.trunc((dayNumberOf(now) - dayNumberOf(start)) / rule.interval);
    case 'WEEKLY':
      return Math.trunc((dayNumberOf(now) - dayNumberOf(start)) / (7 * rule.interval));
    case 'MONTHLY':
      return Math.trunc(((now.year - start.year) * 12 + (now.month - start.month)) / rule.interval);
    case 'YEARLY':
      return Math.trunc((now.year - start.year) / rule.interval);
  }
}

function firstIndexAfter(series: Series, moment: number): number | null {
  let index = Math.max(estimateIndex(series, moment) - 1, 0);
  for (let searched = 0; searched < RECURRENCE_SEARCH_LIMIT; searched += 1, index += 1) {
    if (occurrenceOf(series, index) > moment) return index;
  }
  return null;
}

export const occurrenceAt = ({ rule, anchor, index, clock }: OccurrenceInput): number =>
  occurrenceOf(seriesOf(rule, anchor, clock), index);

export function firstOccurrenceAfter({ rule, anchor, moment, clock }: FirstOccurrenceInput): number | null {
  const series = seriesOf(rule, anchor, clock);
  const index = firstIndexAfter(series, moment);
  return index === null ? null : occurrenceOf(series, index);
}

export function occurrencesBetween({ rule, anchor, from, to, clock, limit }: OccurrenceWindowInput): number[] {
  if (anchor > to || from > to) return [];
  const series = seriesOf(rule, anchor, clock);
  let index = anchor >= from ? 0 : firstIndexAfter(series, from - 1);
  if (index === null) return [];
  const found: number[] = [];
  while (found.length < limit) {
    const at = occurrenceOf(series, index);
    if (at > to) break;
    found.push(at);
    index += 1;
  }
  return found;
}

export function recurrenceLabel(text: string | null | undefined, t: TranslateFn): string | null {
  if (!text) return null;
  const rule = parseRecurrenceRule(text);
  if (!rule) return t('common.recurrence.custom');
  const count = rule.interval;
  switch (rule.frequency) {
    case 'DAILY':
      return count === 1 ? t('common.recurrence.daily') : t('common.recurrence.every-days', { count });
    case 'WEEKLY':
      return count === 1 ? t('common.recurrence.weekly') : t('common.recurrence.every-weeks', { count });
    case 'MONTHLY':
      return count === 1 ? t('common.recurrence.monthly') : t('common.recurrence.every-months', { count });
    case 'YEARLY':
      return count === 1 ? t('common.recurrence.yearly') : t('common.recurrence.every-years', { count });
  }
}
