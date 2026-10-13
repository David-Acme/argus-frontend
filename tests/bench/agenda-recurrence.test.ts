import { describe, expect, test } from 'bun:test';
import {
  MIXED_RULES,
  RECOMPUTE_WEEKS,
  otherHouseholdZone,
  recomputeMedianMs,
  twentySeries,
} from '@tests/support/agenda-recompute';

const RUNS = 9;
const FRAME_MS = 16;

describe('the cumulative recompute of a two-year agenda fits one frame', () => {
  test('the window is 735 days', () => {
    expect(RECOMPUTE_WEEKS * 7).toBe(735);
  });

  test('twenty series of mixed rules in the household zone', () => {
    const series = twentySeries((index) => MIXED_RULES[index % MIXED_RULES.length] ?? 'FREQ=WEEKLY');
    expect(recomputeMedianMs({ series, zone: null, runs: RUNS })).toBeLessThanOrEqual(FRAME_MS);
  });

  test('twenty daily series in a household zone that is not the device zone', () => {
    const series = twentySeries(() => 'FREQ=DAILY');
    expect(recomputeMedianMs({ series, zone: otherHouseholdZone(), runs: RUNS })).toBeLessThanOrEqual(FRAME_MS);
  });
});
