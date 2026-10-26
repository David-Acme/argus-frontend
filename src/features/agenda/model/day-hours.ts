import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { itemEnd } from '@/features/agenda/model/agenda-items';
import type { AgendaItem, DayRange } from '@/features/agenda/model/agenda-items';

export type HourBlock = {
  item: AgendaItem;
  top: number;
  span: number;
  lane: number;
  lanes: number;
};

export type DayHours = {
  hours: number[];
  blocks: HourBlock[];
  allDay: AgendaItem[];
  now: number | null;
};

export type DayHoursInput = { items: readonly AgendaItem[]; range: DayRange; now: number };

type Clock = Pick<DateFormatter, 'hourOf' | 'minuteOf'>;

type Placed = { item: AgendaItem; start: number; end: number };

export const DAY_START_HOUR = 7;

export const DAY_END_HOUR = 21;

const HOUR_MINUTES = 60;

const DAY_MINUTES = 24 * HOUR_MINUTES;

export const MIN_SPAN_MINUTES = 30;

const minuteOfDay = (at: number, clock: Clock): number =>
  clock.hourOf(new Date(at)) * HOUR_MINUTES + clock.minuteOf(new Date(at));

function placed(item: AgendaItem, range: DayRange, clock: Clock): Placed {
  const start = minuteOfDay(item.startsAt, clock);
  const endsAt = item.kind === 'event' ? itemEnd(item) : item.startsAt;
  const end = endsAt > range.to ? DAY_MINUTES : minuteOfDay(endsAt, clock);
  return { item, start, end: Math.max(end, start + MIN_SPAN_MINUTES) };
}

function hourSpan(spots: readonly Placed[]): number[] {
  const first = Math.min(
    DAY_START_HOUR,
    ...spots.map((spot) => Math.floor(spot.start / HOUR_MINUTES))
  );
  const last = Math.min(
    24,
    Math.max(DAY_END_HOUR, ...spots.map((spot) => Math.ceil(spot.end / HOUR_MINUTES)))
  );
  return Array.from({ length: last - first }, (_, index) => first + index);
}

function laneBlocks(cluster: readonly Placed[], offset: number): HourBlock[] {
  const ends: number[] = [];
  const lanes = cluster.map((spot) => {
    const free = ends.findIndex((end) => end <= spot.start);
    const lane = free < 0 ? ends.length : free;
    ends[lane] = spot.end;
    return lane;
  });
  return cluster.map((spot, index) => ({
    item: spot.item,
    top: spot.start - offset,
    span: spot.end - spot.start,
    lane: lanes[index] ?? 0,
    lanes: ends.length,
  }));
}

function clusters(spots: readonly Placed[]): Placed[][] {
  const groups: Placed[][] = [];
  let reach = -1;
  for (const spot of spots) {
    const last = groups.at(-1);
    if (last && spot.start < reach) last.push(spot);
    else groups.push([spot]);
    reach = Math.max(reach, spot.end);
  }
  return groups;
}

export function dayHours({ items, range, now }: DayHoursInput, clock: Clock): DayHours {
  const spots = items
    .filter((item) => !item.allDay)
    .map((item) => placed(item, range, clock))
    .sort((left, right) => left.start - right.start || right.end - left.end);
  const hours = hourSpan(spots);
  const offset = (hours[0] ?? DAY_START_HOUR) * HOUR_MINUTES;
  const today = now >= range.from && now <= range.to;
  const nowAt = today ? minuteOfDay(now, clock) - offset : null;
  return {
    hours,
    blocks: clusters(spots).flatMap((cluster) => laneBlocks(cluster, offset)),
    allDay: items.filter((item) => item.allDay),
    now: nowAt !== null && nowAt >= 0 && nowAt <= hours.length * HOUR_MINUTES ? nowAt : null,
  };
}
