import { describe, expect, test } from 'bun:test';
import {
  advance,
  createDriver,
  paintFrame,
  stepsDue,
  takeEndedEvent,
  type Look,
  type Tick,
} from '@/shared/ui/presence/engine/driver';
import { particleCount } from '@/shared/ui/presence/engine/engine';
import { presenceStates, type Stroke } from '@/shared/ui/presence/engine/types';
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
});

describe('presence engine', () => {
  test('sizes map to the spec forms', () => {
    expect([36, 48, 66, 89, 120, 149, 150, 300].map(particleCount)).toEqual([
      0, 0, 200, 200, 320, 320, 560, 560,
    ]);
  });

  test('tiers halve particles on low and drop trails below high', () => {
    expect(planFor({ size: 300, tier: 'high', reduceMotion: false })).toMatchObject({
      count: 560,
      trails: true,
      activeFps: 60,
    });
    expect(planFor({ size: 300, tier: 'mid', reduceMotion: false })).toMatchObject({
      count: 560,
      trails: false,
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

  test('every state paints finite strokes at every form', () => {
    for (const size of [36, 66, 120, 300]) {
      const driver = createDriver(particleCount(size), 9);
      for (const state of presenceStates) {
        const strokes: Stroke[] = [];
        for (let i = 1; i <= 5; i++) {
          const frame = advance(driver, tick(i / 60, state), look(size));
          paintFrame(driver, frame, (stroke) => strokes.push({ ...stroke }));
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
      paintFrame(driver, frame, () => undefined);
      ended = takeEndedEvent(driver);
    }
    expect(ended).toBe('notify');
    expect(takeEndedEvent(driver)).toBeNull();
  });

  test('resting states run at the rest rate', () => {
    const driver = createDriver(0, 9);
    const idle = { ...tick(1, 'idle'), input: { ...tick(1, 'idle').input, resting: true } };
    expect(stepsDue(driver, idle, look(36))).toBe(1);
    expect(stepsDue(driver, { ...idle, now: 1 + 1 / 60 }, look(36))).toBe(0);
    expect(stepsDue(driver, { ...idle, now: 1 + 1 / 30 }, look(36))).toBe(2);
  });
});
