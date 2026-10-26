import type { DateFormatter } from '@/shared/hooks/use-date-formatter/date';

export type ClockText = Pick<DateFormatter, 'formatTime' | 'atInputTime'>;

const HOUR_MINUTES = 60;

const HALF_DAY = 12;

const CLOCK = /^(\d{1,2})(?:[:.h]?(\d{2}))?([ap])?m?$/;

const pad = (value: number): string => String(value).padStart(2, '0');

function hourOf(hour: number, half: string | undefined): number | null {
  if (half === undefined) return hour < 24 ? hour : null;
  if (hour < 1 || hour > HALF_DAY) return null;
  const base = hour % HALF_DAY;
  return half === 'p' ? base + HALF_DAY : base;
}

export function parseClock(text: string): number | null {
  const plain = text.toLocaleLowerCase().replace(/[\s.]/g, '');
  const match = CLOCK.exec(plain);
  if (!match) return null;
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const hour = hourOf(Number(match[1]), match[3]);
  if (hour === null || minute >= HOUR_MINUTES) return null;
  return hour * HOUR_MINUTES + minute;
}

export const inputTime = (minutes: number): string =>
  `${pad(Math.floor(minutes / HOUR_MINUTES))}:${pad(minutes % HOUR_MINUTES)}`;

export const clockAt = (day: number, minutes: number, date: ClockText): number =>
  date.atInputTime(new Date(day), inputTime(minutes)).getTime();

export const clockText = (at: number, date: ClockText): string => date.formatTime(new Date(at));
