import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { QR_COLORS } from '@/shared/constants';
import { QR_QUIET_ZONE_MODULES, qrLayout } from '@/shared/components/ui/qr-code-layout';

type QrCodeProps = {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  quietZone?: number;
};

export function QrCode({
  value,
  size,
  color = QR_COLORS.foreground,
  backgroundColor = QR_COLORS.background,
  errorCorrection = 'M',
  quietZone = QR_QUIET_ZONE_MODULES,
}: QrCodeProps) {
  const qr = useMemo(
    () => QRCode.create(value, { errorCorrectionLevel: errorCorrection }),
    [value, errorCorrection],
  );

  const n = qr.modules.size;
  const { cell, offset } = qrLayout(size, n, quietZone);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} fill={backgroundColor} />
      {Array.from({ length: n }, (_, y) =>
        Array.from({ length: n }, (_, x) =>
          qr.modules.data[y * n + x] ? (
            <Rect
              key={`${x}-${y}`}
              x={offset + x * cell}
              y={offset + y * cell}
              width={cell + 0.25}
              height={cell + 0.25}
              fill={color}
            />
          ) : null,
        ),
      )}
    </Svg>
  );
}