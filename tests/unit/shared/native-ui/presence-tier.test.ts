import { describe, expect, test } from 'bun:test';
import { installNativeUiMocks } from './native-ui-mocks';

installNativeUiMocks();

const { hardwareCeiling, needsProbe, recordProbe, resolvePerfTier, useAutoTier } =
  await import('@/shared/theme/effects');
const { createPace, noteBeat, notePace } = await import('@/shared/ui/presence/engine/pace');
const { probeVerdict } = await import('@/shared/ui/presence/tier-verdict');

const GIB = 1024 ** 3;
const phone = { android: true, apiLevel: 34, totalMemory: 8 * GIB };

describe('the automatic tier', () => {
  test('an Android phone stays low until the probe answers, then the ceiling caps it', () => {
    const input = { profile: phone, reduceEffects: false, live: null };
    expect(needsProbe(input)).toBe(true);
    expect(resolvePerfTier(input)).toBe('low');
    expect(resolvePerfTier({ ...input, live: 'high' })).toBe('high');
    const sixGigabytes = { ...phone, totalMemory: 5.4 * GIB };
    expect(resolvePerfTier({ ...input, profile: sixGigabytes, live: 'high' })).toBe('high');
    expect(resolvePerfTier({ ...input, live: 'high', ceiling: 'mid' })).toBe('mid');
    expect(resolvePerfTier({ ...input, live: 'high', reduceEffects: true })).toBe('low');
  });

  test('old or small phones never probe, and the web starts at high', () => {
    const old = { profile: { ...phone, apiLevel: 30 }, reduceEffects: false, live: null };
    expect(needsProbe(old)).toBe(false);
    expect(resolvePerfTier(old)).toBe('low');
    const web = { profile: { android: false, apiLevel: null, totalMemory: null } };
    expect(resolvePerfTier({ ...web, reduceEffects: false, live: null })).toBe('high');
    expect(resolvePerfTier({ ...web, reduceEffects: false, live: 'mid' })).toBe('mid');
  });

  test('the probe judges the median half-frame after its warm-up: 5 ms high, 6.25 ms mid', () => {
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

describe('a phone like the S21 FE', () => {
  test('probe high and steady frames, so the tier ends high', () => {
    const s21 = { android: true, apiLevel: 34, totalMemory: 5.4 * GIB };
    expect(hardwareCeiling(s21)).toBe('high');
    const works = Array.from({ length: 30 }, () => 4.2);
    const gaps = Array.from({ length: 30 }, () => 8.3);
    recordProbe(probeVerdict({ works, gaps }));
    const tier = () =>
      resolvePerfTier({ profile: s21, reduceEffects: false, live: useAutoTier.getState().live });
    expect(tier()).toBe('high');
    const pace = createPace();
    let shifts = 0;
    for (let i = 1; i <= 1200; i++) {
      noteBeat(pace, 1 / 120);
      const sample = { now: 1 + i / 120, work: 0.0035, interval: 1 / 120 };
      shifts += Math.abs(notePace(pace, sample, { climbWork: 0, patience: 3 }));
    }
    expect(shifts).toBe(0);
    expect(tier()).toBe('high');
  });

  test('a phone the probe put at mid climbs to high after three seconds of headroom', () => {
    const pace = createPace();
    const shifts: number[] = [];
    for (let i = 1; i <= 240; i++) {
      noteBeat(pace, 1 / 120);
      const sample = { now: 1 + i / 60, work: 0.0075, interval: 1 / 60 };
      const shift = notePace(pace, sample, { climbWork: 1 / 100, patience: 3 });
      if (shift !== 0) shifts.push(shift);
    }
    expect(shifts).toEqual([1]);
  });
});

describe('the frame-time feedback', () => {
  type Frame = { gap: number; work: number };
  const run = (frames: number, sample: (i: number) => Frame, climbWork = 1 / 120) => {
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

  test('the beat is the display period, not a late frame caught up in a burst', () => {
    const pace = createPace();
    for (const since of [1 / 120, 0.0006, 1 / 120, 0.001, 1 / 60]) noteBeat(pace, since);
    expect(pace.beat).toBeCloseTo(1 / 120, 4);
  });

  test('a 60 Hz screen is not late for a 120 fps tier', () => {
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
