import {
  OVERLAY_BODY_HEIGHT_RATIO,
  OVERLAY_BODY_MIN_HEIGHT,
  OVERLAY_CHROME_HEIGHT,
} from '@/shared/constants';
import { useWindowClass } from './use-window-class';

export function useOverlayBodyHeight(): number {
  const { height } = useWindowClass();
  const available = height - OVERLAY_CHROME_HEIGHT;
  return Math.round(Math.max(OVERLAY_BODY_MIN_HEIGHT, Math.min(height * OVERLAY_BODY_HEIGHT_RATIO, available)));
}
