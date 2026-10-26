import { lazy, Suspense } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { QR_COLORS } from '@/shared/constants';
import type { QrCodeProps } from '@/shared/components/ui/qr-code';

const LoadedQrCode = lazy(async () => ({
  default: (await import('@/shared/components/ui/qr-code')).QrCode,
}));

export function LazyQrCode(props: QrCodeProps) {
  const { size, backgroundColor = QR_COLORS.background } = props;
  return (
    <Suspense
      fallback={
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect width={size} height={size} fill={backgroundColor} />
        </Svg>
      }>
      <LoadedQrCode {...props} />
    </Suspense>
  );
}
