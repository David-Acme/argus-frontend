import { beforeAll, describe, expect, test } from 'bun:test';
import { installNativeUiMocks } from './native-ui-mocks';

installNativeUiMocks();

type Modules = {
  effects: typeof import('@/shared/theme/effects');
  pace: typeof import('@/shared/ui/presence/engine/pace');
  verdict: typeof import('@/shared/ui/presence/tier-verdict');
};

let modules: Modules;

beforeAll(async () => {
  modules = {
    effects: await import('@/shared/theme/effects'),
    pace: await import('@/shared/ui/presence/engine/pace'),
    verdict: await import('@/shared/ui/presence/tier-verdict'),
  };
});

const GIB = 1024 ** 3;
const phone = { android: true, apiLevel: 34, totalMemory: 8 * GIB };

describe('the automatic tier', () => {
  test('an Android phone stays low until the probe answers, then the ceiling caps it', () => {
    const { resolvePerfTier, needsProbe } = modules.effects;
    const input = { profile: phone, reduceEffects: false, live: null };
    expect(needsProbe(input)).toBe(true);
    expect(resolvePerfTier(input)).toBe('low');
    expect(resolvePerfTier({ ...input, live: 'high' })).toBe('high');
    const small = { ...phone, totalMemory: 5 * GIB };
    expect(resolvePerfTier({ ...input, profile: small, live: 'high' })).toBe('mid');
    expect(resolvePerfTier({ ...input, live: 'high', reduceEffects: true })).toBe('low');
  });

  test('old or small phones never probe, and the web starts at high', () => {
    const { resolvePerfTier, needsProbe } = modules.effects;
    const old = { profile: { ...phone, apiLevel: 30 }, reduceEffects: false, live: null };
    expect(needsProbe(old)).toBe(false);
    expect(resolvePerfTier(old)).toBe('low');
    const web = { profile: { android: false, apiLevel: null, totalMemory: null } };
    expect(resolvePerfTier({ ...web, reduceEffects: false, live: null })).toBe('high');
    expect(resolvePerfTier({ ...web, reduceEffects: false, live: 'mid' })).toBe('mid');
  });

  test('the probe asks for 4.2 ms for high, 10 ms for mid and few late frames', () => {
    const { probeVerdict } = modules.verdict;
    const works = (ms: number) => Array.from({ length: 20 }, () => ms);
    const gaps = Array.from({ length: 20 }, () => 16.7);
    expect(probeVerdict({ works: works(3), gaps }).tier).toBe('high');
    expect(probeVerdict({ works: works(7), gaps }).tier).toBe('mid');
    expect(probeVerdict({ works: works(12), gaps }).tier).toBe('low');
    const late = gaps.map((gap, i) => (i < 3 ? 40 : gap));
    expect(probeVerdict({ works: works(3), gaps: late })).toMatchObject({
      tier: 'low',
      dropped: 3,
    });
  });
});

describe('the frame-time feedback', () => {
  const run = (frames: number, sample: (i: number) => { gap: number; work: number }) => {
    const { createPace, notePace, noteBeat } = modules.pace;
    const pace = createPace();
    const shifts: number[] = [];
    let now = 1;
    for (let i = 0; i < frames; i++) {
      const { gap, work } = sample(i);
      now += gap;
      noteBeat(pace, gap);
      const shift = notePace(
        pace,
        { now, work, interval: 1 / 120 },
        { climb: true, patience: 300 }
      );
      if (shift !== 0) shifts.push(shift);
    }
    return shifts;
  };

  test('a sustained run of long frames steps down once, a passing hitch never', () => {
    expect(run(60, () => ({ gap: 1 / 120, work: 0.007 }))).toEqual([-1]);
    expect(run(600, (i) => ({ gap: 1 / 120, work: i % 10 === 0 ? 0.02 : 0.002 }))).toEqual([]);
  });

  test('it climbs only after a long stretch of short frames', () => {
    expect(run(299, () => ({ gap: 1 / 120, work: 0.002 }))).toEqual([]);
    expect(run(301, () => ({ gap: 1 / 120, work: 0.002 }))).toEqual([1]);
    expect(run(400, () => ({ gap: 1 / 120, work: 0.004 }))).toEqual([]);
  });

  test('a 60 Hz screen is not late for a 120 fps tier', () => {
    expect(run(400, () => ({ gap: 1 / 60, work: 0.004 }))).toEqual([]);
  });
});
