import { describe, expect, test } from 'bun:test';
import {
  easeToward,
  LIVE_EMPTY,
  LIVE_MIN_SHARE,
  liveBarCount,
  liveBarHeight,
  liveBarX,
  playedShare,
  pushLevel,
  scrollShare,
  wholeSecondsOf,
} from '@/features/conversations/model/live-wave';

const BOX = { width: 200, height: 28, pitch: 4 };

const settle = (fps: number, ms: number): number => {
  const frame = 1000 / fps;
  const frames = Math.round(ms / frame);
  return Array.from({ length: frames }).reduce<number>((level) => easeToward(level, 1, frame), 0);
};

describe('the live waveform', () => {
  test('the level eases by frame time, so 60, 90 and 120 Hz reach the same height at the same moment', () => {
    const at60 = settle(60, 100);
    expect(Math.abs(settle(90, 100) - at60)).toBeLessThan(0.001);
    expect(Math.abs(settle(120, 100) - at60)).toBeLessThan(0.001);
    expect(at60).toBeGreaterThan(0.7);
    expect(easeToward(0.4, 1, 0)).toBe(0.4);
  });

  test('the bars slide one pitch per sample, in from the right edge, with no jump when a sample lands', () => {
    expect(scrollShare(0, 100)).toBe(0);
    expect(scrollShare(50, 100)).toBe(0.5);
    expect(scrollShare(250, 100)).toBe(1);
    expect(liveBarX(BOX, 0, 0)).toBe(200);
    expect(liveBarX(BOX, 0, 1)).toBe(196);
    expect(liveBarX(BOX, 1, 0)).toBe(liveBarX(BOX, 0, 1));
  });

  test('a bar keeps a floor, fills the height at most, and enough bars cover the width', () => {
    expect(liveBarHeight(BOX, 0)).toBeCloseTo(LIVE_MIN_SHARE * 28);
    expect(liveBarHeight(BOX, 3)).toBe(28);
    expect(liveBarCount(BOX)).toBe(51);
  });

  test('a sample counts itself and keeps the newest ones', () => {
    const live = [0.1, 0.2, 0.3].reduce(
      (current, level) => pushLevel(current, level, 2),
      LIVE_EMPTY
    );
    expect(live).toEqual({ seq: 3, values: [0.2, 0.3] });
  });

  test('the recording clock re-renders once a second, not once a sample', () => {
    expect(wholeSecondsOf(1000, 1900)).toBe(1000);
    expect(wholeSecondsOf(1000, 2050)).toBe(2050);
    expect(wholeSecondsOf(0, 100)).toBe(0);
  });

  test('playback progress runs on between position reports at the playback speed', () => {
    expect(playedShare(1000, 500, 1, 10_000)).toBeCloseTo(0.15);
    expect(playedShare(1000, 500, 2, 10_000)).toBeCloseTo(0.2);
    expect(playedShare(9900, 500, 1, 10_000)).toBe(1);
    expect(playedShare(0, 0, 1, 0)).toBe(0);
  });
});
