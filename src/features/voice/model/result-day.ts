export type ResultDay = 'today' | 'tomorrow' | 'yesterday' | 'other';

export type ResultDayInput = {
  at: number;
  now: number;
  startOfDay: (at: number) => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function resultDayOf({ at, now, startOfDay }: ResultDayInput): ResultDay {
  const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY_MS);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return days === -1 ? 'yesterday' : 'other';
}

export type CountWord = 'none' | 'one' | 'many';

export function countWordOf(count: number): CountWord {
  if (count <= 0) return 'none';
  return count === 1 ? 'one' : 'many';
}
