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

  test('the probe judges the median half-frame after its warm-up: 5 ms high, 6.25 ms mid', () => {
    const { probeVerdict } = modules.verdict;
    const works = (ms: number) => Array.from({ length: 30 }, (_, i) => (i < 3 ? 40 : ms));
    const gaps = Array.from({ length: 30 }, () => 8.3);
    expect(probeVerdict({ works: works(3.5), gaps })).toMatchObject({ tier: 'high', workMs: 3.5 });
    expect(probeVerdict({ works: works(5.8), gaps }).tier).toBe('mid');
    expect(probeVerdict({ works: works(8), gaps }).tier).toBe('low');
    const late = gaps.map((gap, i) => (i < 4 ? 40 : gap));
    expect(probeVerdict({ works: works(3), gaps: late })).toMatchObject({
      tier: 'low',
      dropped: 4,
    });
  });
});

describe('the frame-time feedback', () => {
  type Frame = { gap: number; work: number };
  const run = (frames: number, sample: (i: number) => Frame, climbWork = 1 / 120) => {
    const { createPace, notePace, noteBeat } = modules.pace;
    const pace = createPace();
    const shifts: number[] = [];
    let now = 1;
    for (let i = 0; i < frames; i++) {
      const { gap, work } = sample(i);
      now += gap;
      noteBeat(pace, gap);
      const shift = notePace(pace, { now, work, interval: 1 / 60 }, { climbWork, patience: 3 });
      if (shift !== 0) shifts.push(shift);
    }
    return shifts;
  };
  const at60 = (work: number) => () => ({ gap: 1 / 60, work });

  test('a sustained run of long frames steps down once, a passing hitch never', () => {
    expect(run(60, at60(0.014))).toEqual([-1]);
    const hitch = (i: number) => ({ gap: 1 / 60, work: i % 30 === 0 ? 0.03 : 0.009 });
    expect(run(600, hitch)).toEqual([]);
  });

  test('three seconds of headroom step up once; frames over the climb budget never do', () => {
    expect(run(170, at60(0.004))).toEqual([]);
    expect(run(185, at60(0.004))).toEqual([1]);
    expect(run(600, at60(0.009))).toEqual([]);
    expect(run(600, at60(0.004), 0)).toEqual([]);
  });

  test('headroom that keeps breaking does not add up to a climb', () => {
    const shaky = (i: number) => ({ gap: 1 / 60, work: i % 4 === 0 ? 0.0095 : 0.004 });
    expect(run(900, shaky)).toEqual([]);
  });

  test('a 60 Hz screen is not late for a 120 fps tier', () => {
    const { createPace, notePace, noteBeat } = modules.pace;
    const pace = createPace();
    let shifts = 0;
    for (let i = 1; i <= 400; i++) {
      noteBeat(pace, 1 / 60);
      const sample = { now: 1 + i / 60, work: 0.004, interval: 1 / 120 };
      shifts += Math.abs(notePace(pace, sample, { climbWork: 0, patience: 3 }));
    }
    expect(shifts).toBe(0);
  });
});
