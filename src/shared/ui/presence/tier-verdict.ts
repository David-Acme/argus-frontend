import type { PerfTier, ProbeReport } from '@/shared/theme/effects';

export type ProbeSamples = { works: readonly number[]; gaps: readonly number[] };

export const PROBE_LIMITS = {
  highMs: 6,
  midMs: 10,
  lateGapMs: 25,
  maxLate: 2,
} as const;

function percentile(values: readonly number[], share: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? Infinity;
}

export function probeVerdict({ works, gaps }: ProbeSamples): ProbeReport {
  const workMs = percentile(works, 0.9);
  const dropped = gaps.filter((gap) => gap > PROBE_LIMITS.lateGapMs).length;
  const steady = dropped <= PROBE_LIMITS.maxLate;
  let tier: PerfTier = 'low';
  if (steady && workMs <= PROBE_LIMITS.highMs) tier = 'high';
  else if (steady && workMs <= PROBE_LIMITS.midMs) tier = 'mid';
  return { tier, workMs: Math.round(workMs * 10) / 10, dropped };
}
