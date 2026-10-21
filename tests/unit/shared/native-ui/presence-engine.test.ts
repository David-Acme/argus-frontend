import { describe, expect, test } from 'bun:test';
import {
  advance,
  createDriver,
  frameDue,
  paintFrame,
  takeEndedEvent,
  type Look,
  type Tick,
} from '@/shared/ui/presence/engine/driver';
import { particleCount } from '@/shared/ui/presence/engine/engine';
import {
  presenceStates,
  STREAK_FIELDS,
  type Sinks,
  type Stroke,
} from '@/shared/ui/presence/engine/types';
import { planFor } from '@/shared/ui/presence/plan';
import { tokens } from '@/shared/theme/tokens';

const look = (size: number): Look => ({
  size,
  palette: tokens.illustration.estela.dark,
  dark: true,
  activeFps: 60,
  restFps: 30,
  leanWhileScrolling: true,
});

const tick = (
  now: number,
  state: Tick['input']['state'],
  event?: Tick['input']['eventName']
): Tick => ({
  now,
  input: {
    state,
    resting: false,
    intensity: 0.5,
    targetX: 0.3,
    targetY: 0,
    eventName: event ?? null,
    eventId: event ? 1 : 0,
  },
  level: null,
  scroll: 0,
  leanX: 0,
  leanY: 0,
  steps: 1,
  lag: 0,
  split: false,
});

function collect(strokes: Stroke[]): Sinks {
  return {
    stroke: (stroke) => strokes.push({ ...stroke }),
    streaks: (buffer, count, width) => {
      for (let i = 0; i < count; i++) {
        const [x1 = 0, y1 = 0, x2 = 0, y2 = 0, r = 0, g = 0, b = 0, a = 0] = buffer.subarray(
          i * STREAK_FIELDS,
          (i + 1) * STREAK_FIELDS
        );
        strokes.push({ round: true, x1, y1, x2, y2, r, g, b, a, w: width });
      }
    },
  };
}

const quiet: Sinks = { stroke: () => undefined, streaks: () => undefined };

describe('presence engine', () => {
  test('sizes map to the spec forms', () => {
    expect([36, 48, 66, 89, 120, 149, 150, 300].map(particleCount)).toEqual([
      0, 0, 200, 200, 320, 320, 560, 560,
    ]);
  });

  test('high and mid keep the whole look, high runs at the display rate, low halves the particles', () => {
    expect(planFor({ size: 300, tier: 'high', reduceMotion: false })).toMatchObject({
      count: 560,
      trails: true,
      activeFps: 120,
      restFps: 60,
    });
    expect(planFor({ size: 300, tier: 'mid', reduceMotion: false })).toMatchObject({
      count: 560,
      trails: true,
      activeFps: 60,
      restFps: 30,
    });
    expect(planFor({ size: 36, tier: 'high', reduceMotion: false })).toMatchObject({
      count: 0,
      activeFps: 30,
      restFps: 30,
    });
    expect(planFor({ size: 120, tier: 'low', reduceMotion: false })).toMatchObject({
      count: 160,
      trails: false,
      activeFps: 30,
    });
    expect(planFor({ size: 36, tier: 'high', reduceMotion: true })).toMatchObject({
      count: 0,
      still: true,
    });
  });

  test('an adaptive plan watches its frames and may climb only below the ceiling', () => {
    const adaptive = (tier: 'low' | 'mid' | 'high', drops: number) =>
      planFor({ size: 300, tier, reduceMotion: false, adaptation: { ceiling: 'high', drops } });
    expect(adaptive('mid', 0)).toMatchObject({ watch: true, climb: true, patience: 300 });
    expect(adaptive('high', 0)).toMatchObject({ watch: true, climb: false });
    expect(adaptive('low', 2).patience).toBe(1200);
    expect(planFor({ size: 300, tier: 'mid', reduceMotion: false })).toMatchObject({
      watch: false,
      climb: false,
    });
  });

  test('every state paints finite strokes at every form', () => {
    for (const size of [36, 66, 120, 300]) {
      const driver = createDriver(particleCount(size), 9);
      for (const state of presenceStates) {
        const strokes: Stroke[] = [];
        for (let i = 1; i <= 5; i++) {
          const frame = advance(driver, tick(i / 60, state), look(size));
          paintFrame(driver, frame, collect(strokes));
        }
        expect(strokes.length).toBeGreaterThan(0);
        for (const s of strokes) {
          expect([s.x1, s.y1, s.x2, s.y2, s.a, s.w].every(Number.isFinite)).toBe(true);
          expect(s.a).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  test('a one-shot event ends and is reported once', () => {
    const driver = createDriver(200, 9);
    advance(driver, tick(1, 'idle', 'notify'), look(66));
    let ended = null;
    for (let i = 1; i <= 120 && !ended; i++) {
      const frame = advance(driver, tick(1 + i / 60, 'idle', 'notify'), look(66));
      paintFrame(driver, frame, quiet);
      ended = takeEndedEvent(driver);
    }
    expect(ended).toBe('notify');
    expect(takeEndedEvent(driver)).toBeNull();
  });

  test('resting states run at the rest rate', () => {
    const driver = createDriver(0, 9);
    const idle = { ...tick(1, 'idle'), input: { ...tick(1, 'idle').input, resting: true } };
    expect(frameDue(driver, idle, look(36))).toBe(true);
    expect(frameDue(driver, { ...idle, now: 1 + 1 / 60 }, look(36))).toBe(false);
    const late = { ...idle, now: 1 + 1 / 30 };
    expect(frameDue(driver, late, look(36))).toBe(true);
    expect(late.steps).toBe(2);
  });

  function drawn(fps: number, hz: number): number {
    const driver = createDriver(200, 9);
    const fast = { ...look(66), activeFps: fps };
    let frames = 0;
    for (let i = 1; i <= hz; i++) if (frameDue(driver, tick(1 + i / hz, 'listen'), fast)) frames++;
    return frames;
  }

  test('the frame rate follows the display up to 120 and never passes its tier', () => {
    expect(drawn(120, 120)).toBe(120);
    expect(drawn(120, 144)).toBeLessThanOrEqual(121);
    expect(drawn(60, 120)).toBe(60);
    expect(drawn(60, 144)).toBeLessThanOrEqual(61);
    expect(drawn(60, 90)).toBeGreaterThanOrEqual(44);
    expect(drawn(120, 60)).toBe(60);
  });

  test('above 60 fps each half of the particles keeps its 60 Hz step, on alternate frames', () => {
    const driver = createDriver(200, 9);
    const fast = { ...look(300), activeFps: 120 };
    const even: number[] = [];
    const odd: number[] = [];
    for (let i = 0; i <= 120; i++) {
      const t = tick(1 + i / 120, 'listen');
      if (!frameDue(driver, t, fast) || !t.split) continue;
      even.push(t.steps);
      odd.push(t.lag);
    }
    const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);
    expect(sum(even)).toBeGreaterThanOrEqual(59);
    expect(sum(even)).toBeLessThanOrEqual(61);
    expect(sum(odd)).toBeGreaterThanOrEqual(59);
    expect(sum(odd)).toBeLessThanOrEqual(61);
    expect(even.every((n, i) => n + (odd[i] ?? 0) === 1)).toBe(true);
  });
});
