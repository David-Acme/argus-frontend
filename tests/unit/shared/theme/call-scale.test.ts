import { describe, expect, test } from 'bun:test';
import { callScaleOf } from '@/shared/theme/call-scale';

describe('the call stage scales with the window height', () => {
  test('a tall phone keeps the prototype avatar with the finer controls', () => {
    expect(callScaleOf(760)).toMatchObject({
      avatar: 168,
      ringControl: 54,
      panelControl: 48,
      captionLines: 2,
    });
  });

  test('360×640 and 375×667 shrink the avatar and keep the controls', () => {
    expect(callScaleOf(640)).toMatchObject({ avatar: 136, ringControl: 54, panelControl: 48 });
    expect(callScaleOf(667).avatar).toBe(136);
  });

  test('320×568 keeps one caption line and smaller controls', () => {
    expect(callScaleOf(568)).toMatchObject({
      avatar: 104,
      ringControl: 52,
      panelControl: 48,
      captionLines: 1,
    });
  });

  test('phone landscape keeps the controls at touch size and the avatar small', () => {
    const flat = callScaleOf(360);
    expect(flat.avatar).toBe(64);
    expect(flat.panelControl).toBeGreaterThanOrEqual(48);
    expect(flat.ringControl).toBeGreaterThanOrEqual(48);
  });

  test('the controls are about a sixth smaller than the first stage and never under touch size', () => {
    const tall = callScaleOf(760);
    expect(tall.ringControl / 64).toBeLessThanOrEqual(0.85);
    expect(tall.panelControl / 56).toBeLessThanOrEqual(0.86);
    for (const height of [900, 640, 568, 360]) {
      expect(callScaleOf(height).ringControl).toBeGreaterThanOrEqual(48);
      expect(callScaleOf(height).panelControl).toBeGreaterThanOrEqual(48);
    }
  });

  test('each step is no larger than the step above it', () => {
    const heights = [900, 740, 700, 640, 600, 560, 500, 320];
    const avatars = heights.map((height) => callScaleOf(height).avatar);
    expect(avatars).toEqual([...avatars].sort((a, b) => b - a));
  });
});
