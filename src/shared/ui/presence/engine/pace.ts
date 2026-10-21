export type Pace = { score: number; good: number; last: number; quietUntil: number };

export type PaceSample = { now: number; work: number; interval: number };

export type PacePolicy = { climb: boolean; patience: number };

export type PaceShift = -1 | 0 | 1;

const LONG_WORK = 0.75;
const LATE_GAP = 1.5;
const PAUSE_GAP = 0.25;
const GOOD_CREDIT = 0.5;
const SETTLE = 1;
export const TRIP_SCORE = 45;
export const CLIMB_WORK = 0.0033;
export const CLIMB_FRAMES = 300;

export function createPace(): Pace {
  'worklet';
  return { score: 0, good: 0, last: 0, quietUntil: 0 };
}

function restart(pace: Pace, now: number): void {
  'worklet';
  pace.score = 0;
  pace.good = 0;
  pace.quietUntil = now + SETTLE;
}

export function notePace(pace: Pace, sample: PaceSample, policy: PacePolicy): PaceShift {
  'worklet';
  const { now, work, interval } = sample;
  const gap = pace.last > 0 ? now - pace.last : 0;
  pace.last = now;
  if (gap > PAUSE_GAP || now < pace.quietUntil) return 0;
  const long = work > interval * LONG_WORK || gap > interval * LATE_GAP;
  pace.score = Math.max(0, pace.score + (long ? 1 : -GOOD_CREDIT));
  pace.good = !long && work < CLIMB_WORK ? pace.good + 1 : 0;
  if (pace.score >= TRIP_SCORE) {
    restart(pace, now);
    return -1;
  }
  if (!policy.climb || pace.good < policy.patience) return 0;
  restart(pace, now);
  return 1;
}
