import { describe, expect, test } from 'bun:test';
import { overlayBackPress } from '@/shared/components/ui/overlay-back-press';

describe('Android Back on an open sheet or dialog', () => {
  test('closes a dismissible overlay and consumes the press', () => {
    let closed = 0;
    expect(overlayBackPress(true, () => (closed += 1))).toBe(true);
    expect(closed).toBe(1);
  });

  test('keeps an overlay that is saving open, and still does not navigate behind it', () => {
    let closed = 0;
    expect(overlayBackPress(false, () => (closed += 1))).toBe(true);
    expect(closed).toBe(0);
  });
});
