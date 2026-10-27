export type DatePart = 'day' | 'month' | 'year';

export type TimePart = 'hour' | 'minute' | 'period';

export type SegmentPart = DatePart | TimePart;

export type SegmentSpec = { min: number; max: number; digits: number };

export type DateParts = Record<DatePart, number | null>;

export type TimeParts = Record<TimePart, number | null>;

export type Typed = { text: string; done: boolean };

const YEAR_MIN = 1900;

const YEAR_MAX = 2100;

const HOUR = 60;

const HALF_DAY = 12;

const SAMPLE = { day: '22', month: '11', year: '2033' } as const;

export function segmentSpec(part: SegmentPart, hour12: boolean): SegmentSpec {
  switch (part) {
    case 'day':
      return { min: 1, max: 31, digits: 2 };
    case 'month':
      return { min: 1, max: 12, digits: 2 };
    case 'year':
      return { min: YEAR_MIN, max: YEAR_MAX, digits: 4 };
    case 'hour':
      return hour12 ? { min: 1, max: 12, digits: 2 } : { min: 0, max: 23, digits: 2 };
    case 'minute':
      return { min: 0, max: 59, digits: 2 };
    case 'period':
      return { min: 0, max: 1, digits: 1 };
  }
}

export function dateOrderOf(sample: string): DatePart[] {
  const parts: DatePart[] = ['day', 'month', 'year'];
  return parts
    .map((part) => ({ part, at: sample.indexOf(SAMPLE[part]) }))
    .sort((left, right) => left.at - right.at)
    .map(({ part }) => part);
}

export const sampleDay = (): Date =>
  new Date(Number(SAMPLE.year), Number(SAMPLE.month) - 1, Number(SAMPLE.day));

export function typeDigit(text: string, digit: string, spec: SegmentSpec): Typed {
  const next = `${text.length >= spec.digits ? '' : text}${digit}`;
  return { text: next, done: next.length >= spec.digits || Number(next) * 10 > spec.max };
}

export function stepValue(value: number | null, delta: number, spec: SegmentSpec): number {
  if (value === null) return delta > 0 ? spec.min : spec.max;
  const span = spec.max - spec.min + 1;
  return ((((value - spec.min + delta) % span) + span) % span) + spec.min;
}

export function partsOfDay(at: number | null): DateParts {
  if (at === null) return { day: null, month: null, year: null };
  const value = new Date(at);
  return { day: value.getDate(), month: value.getMonth() + 1, year: value.getFullYear() };
}

export function dayOfParts({ day, month, year }: DateParts): number | null {
  if (day === null || month === null || year === null) return null;
  if (year < YEAR_MIN || year > YEAR_MAX) return null;
  const value = new Date(year, month - 1, day);
  const real = value.getDate() === day && value.getMonth() === month - 1;
  return real ? value.getTime() : null;
}

export function partsOfTime(minutes: number | null, hour12: boolean): TimeParts {
  if (minutes === null) return { hour: null, minute: null, period: null };
  const hour = Math.floor(minutes / HOUR) % 24;
  const minute = minutes % HOUR;
  if (!hour12) return { hour, minute, period: null };
  const shown = hour % HALF_DAY;
  return { hour: shown === 0 ? HALF_DAY : shown, minute, period: hour >= HALF_DAY ? 1 : 0 };
}

export function timeOfParts({ hour, minute, period }: TimeParts, hour12: boolean): number | null {
  if (hour === null || minute === null) return null;
  if (minute < 0 || minute >= HOUR) return null;
  if (!hour12) return hour >= 0 && hour < 24 ? hour * HOUR + minute : null;
  if (hour < 1 || hour > HALF_DAY || period === null) return null;
  return ((hour % HALF_DAY) + period * HALF_DAY) * HOUR + minute;
}

export type SegmentAction = 'up' | 'down' | 'left' | 'right' | 'clear' | 'period' | 'digit';

const MOVES: Record<string, SegmentAction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Backspace: 'clear',
  Delete: 'clear',
};

const PERIOD_LETTERS = new Set(['a', 'p']);

export function segmentAction(key: string, part: SegmentPart): SegmentAction | null {
  if (Object.hasOwn(MOVES, key)) return MOVES[key] ?? null;
  if (part === 'period') return PERIOD_LETTERS.has(key.toLowerCase()) ? 'period' : null;
  return /^\d$/.test(key) ? 'digit' : null;
}
