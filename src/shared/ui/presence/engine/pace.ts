export type Pace = {
  score: number;
  credit: number;
  last: number;
  quietUntil: number;
  beat: number;
};

export type PaceSample = { now: number; work: number; interval: number };

export type PacePolicy = { climbWork: number; patience: number };

export type PaceShift = -1 | 0 | 1;

const LONG_WORK = 0.75;
const LATE_GAP = 1.5;
const PAUSE_GAP = 0.25;
const GOOD_CREDIT = 0.5;
const SETTLE = 1;
const BEAT_DRIFT = 1.002;
const SHORTEST_BEAT = 0.004;
const DEBIT = 4;
export const TRIP_SCORE = 45;
export const CLIMB_SECONDS = 3;

export function createPace(): Pace {
  'worklet';
  return { score: 0, credit: 0, last: 0, quietUntil: 0, beat: 0 };
}

function restart(pace: Pace, now: number): void {
  'worklet';
  pace.score = 0;
  pace.credit = 0;
  pace.quietUntil = now + SETTLE;
}

export function noteBeat(pace: Pace, since: number): void {
  'worklet';
  if (since < SHORTEST_BEAT || since > PAUSE_GAP) return;
  pace.beat = pace.beat > 0 ? Math.min(pace.beat * BEAT_DRIFT, since) : since;
}

function headroom(pace: Pace, sample: PaceSample, policy: PacePolicy): boolean {
  'worklet';
  return policy.climbWork > 0 && pace.score === 0 && sample.work <= policy.climbWork;
}

export function notePace(pace: Pace, sample: PaceSample, policy: PacePolicy): PaceShift {
  'worklet';
  const { now, work } = sample;
  const interval = Math.max(sample.interval, pace.beat);
  const gap = pace.last > 0 ? now - pace.last : 0;
  pace.last = now;
  if (gap > PAUSE_GAP || now < pace.quietUntil) return 0;
  const long = work > interval * LONG_WORK || gap > interval * LATE_GAP;
  pace.score = Math.max(0, pace.score + (long ? 1 : -GOOD_CREDIT));
  const room = !long && headroom(pace, sample, policy);
  pace.credit = Math.max(0, pace.credit + (room ? gap : -DEBIT * gap));
  if (pace.score >= TRIP_SCORE) {
    restart(pace, now);
    return -1;
  }
  if (policy.climbWork <= 0 || pace.credit < policy.patience) return 0;
  restart(pace, now);
  return 1;
}
