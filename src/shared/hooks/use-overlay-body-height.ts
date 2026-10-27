import { useWindowDimensions } from 'react-native';
import {
  OVERLAY_BODY_HEIGHT_RATIO,
  OVERLAY_BODY_MIN_HEIGHT,
  OVERLAY_CHROME_HEIGHT,
} from '@/shared/constants/layout.constant';
import { heightLayoutOf } from '@/shared/theme/height-layout';

export function overlayBodyHeightOf(width: number, height: number): number {
  const available = height - OVERLAY_CHROME_HEIGHT;
  const { heightClass, landscape } = heightLayoutOf({ width, height });
  const room =
    heightClass === 'regular' && !landscape
      ? Math.min(height * OVERLAY_BODY_HEIGHT_RATIO, available)
      : available;
  return Math.round(Math.max(OVERLAY_BODY_MIN_HEIGHT, room));
}

export function useOverlayBodyHeight(): number {
  const { width, height } = useWindowDimensions();
  return overlayBodyHeightOf(width, height);
}
