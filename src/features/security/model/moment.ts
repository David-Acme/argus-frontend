import type { TranslateFn } from '@/core/types';

export type MomentFormat = {
  t: TranslateFn;
  time: (value: Date) => string;
  day: (value: Date) => string;
};

const MINUTE_MS = 60_000;

const HOUR_MINUTES = 60;

function dayStart(at: number): number {
  return new Date(at).setHours(0, 0, 0, 0);
}

export function calendarDaysBetween(at: number, now: number): number {
  return Math.max(0, Math.round((dayStart(now) - dayStart(at)) / (MINUTE_MS * HOUR_MINUTES * 24)));
}

export function tileWhen(at: number, now: number, format: MomentFormat): string {
  const days = calendarDaysBetween(at, now);
  if (days === 0) return format.time(new Date(at));
  if (days === 1) return format.t('screens.security.happened.yesterday');
  return format.day(new Date(at));
}

export function feedWhen(at: number, now: number, format: MomentFormat): string {
  const minutes = Math.floor((now - at) / MINUTE_MS);
  if (minutes >= 0 && minutes < 1) return format.t('screens.security.happened.now');
  if (minutes >= 1 && minutes < HOUR_MINUTES)
    return format.t('screens.security.happened.minutes-ago', { count: String(minutes) });
  const time = format.time(new Date(at));
  const days = calendarDaysBetween(at, now);
  if (days === 0) return time;
  if (days === 1) return format.t('screens.security.happened.yesterday-at', { time });
  return format.t('screens.security.happened.day-at', { day: format.day(new Date(at)), time });
}
