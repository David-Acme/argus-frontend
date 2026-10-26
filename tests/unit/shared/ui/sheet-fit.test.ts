import { describe, expect, test } from 'bun:test';
import { sheetFit } from '@/shared/ui/sheet/sheet-fit';

describe('the phone sheet fits the window', () => {
  test('a short form sizes to its content and a long one starts at 60 %', () => {
    expect(sheetFit(false, 800)).toEqual({ detents: ['auto'], scrolls: false });
    expect(sheetFit(true, 800)).toEqual({ detents: [0.6, 1], scrolls: true });
  });

  test('on a short phone every form opens near full height and scrolls', () => {
    for (const height of [568, 640, 667]) {
      expect(sheetFit(false, height)).toEqual({ detents: [1], scrolls: true });
    }
  });
});
