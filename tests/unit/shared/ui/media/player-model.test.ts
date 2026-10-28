import { describe, expect, test } from 'bun:test';
import { formatDuration } from '@/shared/libs/duration';
import {
  CONTROLS_HIDE_MS,
  SEEK_STREAK_MS,
  clampTime,
  controlsShown,
  fractionOf,
  isBuffering,
  loadingLook,
  nextSpeed,
  nextStreak,
  rememberPosition,
  resumePosition,
  scrubTime,
  skipTarget,
  streakSeconds,
  tapZone,
} from '@/shared/ui/media/player/player-model';

describe('player times', () => {
  test('durations read m:ss, and h:mm:ss once they pass an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(19_400)).toBe('0:19');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
  });

  test('a seek of ten seconds stays inside the clip', () => {
    expect(skipTarget({ positionMs: 5000, deltaMs: 10_000, durationMs: 19_000 })).toBe(15_000);
    expect(skipTarget({ positionMs: 15_000, deltaMs: 10_000, durationMs: 19_000 })).toBe(19_000);
    expect(skipTarget({ positionMs: 4000, deltaMs: -10_000, durationMs: 19_000 })).toBe(0);
    expect(clampTime(Number.NaN, 19_000)).toBe(0);
  });

  test('scrubbing maps the finger to a time, and the bar to a fraction', () => {
    expect(scrubTime({ x: 150, width: 300, durationMs: 19_000 })).toBe(9500);
    expect(scrubTime({ x: -20, width: 300, durationMs: 19_000 })).toBe(0);
    expect(scrubTime({ x: 400, width: 300, durationMs: 19_000 })).toBe(19_000);
    expect(scrubTime({ x: 10, width: 0, durationMs: 19_000 })).toBe(0);
    expect(fractionOf(4750, 19_000)).toBe(0.25);
    expect(fractionOf(10, 0)).toBe(0);
  });
});

describe('double taps', () => {
  test('the outer thirds seek, the middle plays or pauses', () => {
    expect(tapZone(20, 300)).toBe('back');
    expect(tapZone(150, 300)).toBe('centre');
    expect(tapZone(280, 300)).toBe('forward');
  });

  test('taps on the same side within the streak window add ten seconds each', () => {
    const first = nextStreak(null, 'forward', 1000);
    const second = nextStreak(first, 'forward', 1000 + SEEK_STREAK_MS - 1);
    const third = nextStreak(second, 'forward', 1000 + SEEK_STREAK_MS);
    expect([first, second, third].map(streakSeconds)).toEqual([10, 20, 30]);
    expect(streakSeconds(nextStreak(third, 'back', 1500))).toBe(10);
    expect(streakSeconds(nextStreak(third, 'forward', 5000))).toBe(10);
  });
});

describe('controls and loading', () => {
  test('controls hide only while playing, after their time, and never while scrubbing', () => {
    const shownUntil = 1000 + CONTROLS_HIDE_MS;
    expect(controlsShown({ status: 'playing', scrubbing: false, shownUntil, now: 2000 })).toBe(
      true
    );
    expect(
      controlsShown({ status: 'playing', scrubbing: false, shownUntil, now: shownUntil })
    ).toBe(false);
    expect(controlsShown({ status: 'playing', scrubbing: true, shownUntil, now: 9000 })).toBe(true);
    expect(controlsShown({ status: 'ready', scrubbing: false, shownUntil, now: 9000 })).toBe(true);
    expect(controlsShown({ status: 'ended', scrubbing: false, shownUntil, now: 9000 })).toBe(true);
  });

  test('before the first frame the poster shows, or the skeleton when there is none', () => {
    expect(loadingLook({ painted: false, poster: true })).toBe('poster');
    expect(loadingLook({ painted: false, poster: false })).toBe('skeleton');
    expect(loadingLook({ painted: true, poster: true })).toBe('none');
  });

  test('buffering is a wait after the picture has started, not the first load', () => {
    expect(isBuffering('loading', false)).toBe(false);
    expect(isBuffering('loading', true)).toBe(true);
    expect(isBuffering('playing', true)).toBe(false);
  });

  test('speeds cycle 0.5, 1, 1.5, 2', () => {
    expect([0.5, 1, 1.5, 2].map(nextSpeed)).toEqual([1, 1.5, 2, 0.5]);
  });

  test('a clip left midway resumes there; one left at the start or the end starts over', () => {
    rememberPosition('clip:a', 7000, 19_000);
    rememberPosition('clip:b', 1000, 19_000);
    rememberPosition('clip:c', 18_500, 19_000);
    expect([resumePosition('clip:a'), resumePosition('clip:b'), resumePosition('clip:c')]).toEqual([
      7000, 0, 0,
    ]);
  });
});
