import QRCode from 'qrcode';
import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';

type QrCodeProps = {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
};

export function QrCode({
  value,
  size,
  color = '#181816',
  backgroundColor = '#ffffff',
  errorCorrection = 'M',
}: QrCodeProps) {
  const qr = useMemo(
    () => QRCode.create(value, { errorCorrectionLevel: errorCorrection }),
    [value, errorCorrection],
  );

  const n = qr.modules.size;
  const cell = size / n;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect width={size} height={size} fill={backgroundColor} />
      {Array.from({ length: n }, (_, y) =>
        Array.from({ length: n }, (_, x) =>
          qr.modules.data[y * n + x] ? (
            <Rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
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