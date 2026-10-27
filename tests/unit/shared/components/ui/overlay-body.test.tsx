import { describe, expect, test } from 'bun:test';
import {
  OVERLAY_BODY_HEIGHT_RATIO,
  OVERLAY_BODY_MIN_HEIGHT,
  OVERLAY_CHROME_HEIGHT,
} from '@/shared/constants/layout.constant';
import { overlayBodyHeightOf } from '@/shared/components/ui/overlay-body';

describe('overlay body height', () => {
  test('a tall phone keeps the body to its share of the window', () => {
    expect(overlayBodyHeightOf(390, 844)).toBe(Math.round(844 * OVERLAY_BODY_HEIGHT_RATIO));
  });

  test('a short phone gives the body all the room the sheet chrome leaves', () => {
    for (const height of [568, 640, 667, 740])
      expect(overlayBodyHeightOf(360, height)).toBe(height - OVERLAY_CHROME_HEIGHT);
  });

  test('a phone on its side never goes below the minimum body', () => {
    expect(overlayBodyHeightOf(740, 360)).toBe(OVERLAY_BODY_MIN_HEIGHT);
  });
});
