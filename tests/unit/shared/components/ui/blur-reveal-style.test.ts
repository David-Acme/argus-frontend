import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BLUR_INITIAL_PX, REVEAL_LIFT_PX, revealStyle } from '@/shared/components/ui/blur-reveal-style';

describe('revealStyle', () => {
  test('native carries no filter, and settles on plain opacity', () => {
    for (const progress of [0, 0.25, 0.6, 1]) {
      const style = revealStyle({ blur: true, scale: false, platform: 'native', progress, reduceMotion: false });
      expect(style.filter).toBeUndefined();
      expect(style.opacity).toBe(progress);
    }
    const settled = revealStyle({ blur: true, scale: false, platform: 'native', progress: 1, reduceMotion: false });
    expect(settled.filter).toBeUndefined();
    expect(settled.transform).toEqual([{ translateY: 0 }]);
  });

  test('native keeps a soft lift where the blur used to be', () => {
    const start = revealStyle({ blur: true, scale: false, platform: 'native', progress: 0, reduceMotion: false });
    expect(start.transform).toEqual([{ translateY: REVEAL_LIFT_PX }]);
  });

  test('web still blurs from the initial radius down to none', () => {
    const start = revealStyle({ blur: true, scale: false, platform: 'web', progress: 0, reduceMotion: false });
    const settled = revealStyle({ blur: true, scale: false, platform: 'web', progress: 1, reduceMotion: false });
    expect(start.filter).toEqual([{ blur: `${BLUR_INITIAL_PX.toFixed(1)}px` }]);
    expect(settled.filter).toEqual([{ blur: '0.0px' }]);
  });

  test('reduced motion reveals with opacity alone on both platforms', () => {
    for (const platform of ['web', 'native'] as const) {
      const style = revealStyle({ blur: true, scale: true, platform, progress: 0.5, reduceMotion: true });
      expect(style).toEqual({ opacity: 0.5 });
    }
  });

  test('a scale reveal keeps its transform and adds no filter on native', () => {
    const style = revealStyle({ blur: true, scale: true, platform: 'native', progress: 0, reduceMotion: false });
    expect(style.filter).toBeUndefined();
    expect(style.transform).toEqual([{ scale: 0.96 }]);
  });

  test('the component hands the real platform to the style', () => {
    const source = readFileSync(
      join(import.meta.dir, '../../../../../src/shared/components/ui/blur-reveal.tsx'),
      'utf8'
    );
    expect(source).toMatch(/platform:\s*IS_WEB\s*\?\s*'web'\s*:\s*'native'/);
  });

  test('without blur neither platform filters', () => {
    for (const platform of ['web', 'native'] as const) {
      const style = revealStyle({ blur: false, scale: false, platform, progress: 0.5, reduceMotion: false });
      expect(style).toEqual({ opacity: 0.5 });
    }
  });
});
