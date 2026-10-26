import { describe, expect, test } from 'bun:test';
import { callScaleOf } from '@/shared/theme/call-scale';

describe('the call stage scales with the window height', () => {
  test('a tall phone keeps the prototype sizes', () => {
    expect(callScaleOf(760)).toMatchObject({
      avatar: 168,
      ringControl: 64,
      panelControl: 56,
      captionLines: 2,
    });
  });

  test('360×640 and 375×667 shrink the avatar and keep the controls', () => {
    expect(callScaleOf(640)).toMatchObject({ avatar: 136, ringControl: 64, panelControl: 56 });
    expect(callScaleOf(667).avatar).toBe(136);
  });

  test('320×568 keeps one caption line and smaller controls', () => {
    expect(callScaleOf(568)).toMatchObject({
      avatar: 104,
      ringControl: 56,
      panelControl: 52,
      captionLines: 1,
    });
  });

  test('phone landscape keeps the controls at touch size and the avatar small', () => {
    const flat = callScaleOf(360);
    expect(flat.avatar).toBe(64);
    expect(flat.panelControl).toBeGreaterThanOrEqual(48);
    expect(flat.ringControl).toBeGreaterThanOrEqual(48);
  });

  test('each step is no larger than the step above it', () => {
    const heights = [900, 740, 700, 640, 600, 560, 500, 320];
    const avatars = heights.map((height) => callScaleOf(height).avatar);
    expect(avatars).toEqual([...avatars].sort((a, b) => b - a));
  });
});
