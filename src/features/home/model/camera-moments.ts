import type { TranslateFn } from '@/core/types';

export type MomentFormat = {
  t: TranslateFn;
  time: (value: Date) => string;
  day: (value: Date) => string;
};

const DAY_MS = 86_400_000;

function startOfDay(at: number): number {
  return new Date(at).setHours(0, 0, 0, 0);
}

export function daysAgo(at: number, now: number): number {
  return Math.max(0, Math.round((startOfDay(now) - startOfDay(at)) / DAY_MS));
}

export function tileMoment(at: number, now: number, format: MomentFormat): string {
  const date = new Date(at);
  const days = daysAgo(at, now);
  if (days === 0) return format.time(date);
  if (days === 1) return format.t('screens.home.camera-sections.yesterday');
  return format.day(date);
}

export function rowMoment(at: number, now: number, format: MomentFormat): string {
  const date = new Date(at);
  const time = format.time(date);
  const days = daysAgo(at, now);
  if (days === 0) return time;
  if (days === 1) return format.t('screens.home.camera-sections.yesterday-at', { time });
  return format.t('screens.home.camera-sections.day-at', { day: format.day(date), time });
}
