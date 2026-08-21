import { describe, expect, test } from 'bun:test';
import { shouldUseQrSupportingPane } from '../src/shared/libs/qr-layout';

describe('shouldUseQrSupportingPane', () => {
  const thresholds = { mediumMin: 640, tallMin: 500 };

  test('uses a supporting pane for a tall tablet in landscape', () => {
    expect(shouldUseQrSupportingPane(800, 562, thresholds)).toBe(true);
  });

  test('keeps a phone in landscape on the bottom sheet layout', () => {
    expect(shouldUseQrSupportingPane(800, 393, thresholds)).toBe(false);
  });

  test('keeps a tablet in portrait on the bottom sheet layout', () => {
    expect(shouldUseQrSupportingPane(562, 800, thresholds)).toBe(false);
  });
});
