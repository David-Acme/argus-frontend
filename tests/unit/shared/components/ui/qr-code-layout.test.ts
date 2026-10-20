import { describe, expect, test } from 'bun:test';
import { QR_QUIET_ZONE_MODULES, qrLayout } from '@/shared/components/ui/qr-code-layout';

describe('the QR keeps its quiet zone', () => {
  test('four light modules surround the code by default, inside the drawn size', () => {
    const { cell, offset } = qrLayout(220, 29);
    expect(QR_QUIET_ZONE_MODULES).toBe(4);
    expect(cell).toBeCloseTo(220 / 37);
    expect(offset).toBeCloseTo(4 * cell);
    expect(offset * 2 + 29 * cell).toBeCloseTo(220);
  });

  test('a code already framed by a light card can draw edge to edge', () => {
    expect(qrLayout(200, 25, 0)).toEqual({ cell: 8, offset: 0 });
  });
});
