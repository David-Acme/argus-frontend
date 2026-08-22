import {
  OVERLAY_BODY_HEIGHT_RATIO,
  OVERLAY_BODY_MIN_HEIGHT,
  OVERLAY_CHROME_HEIGHT,
} from '@/shared/constants';
import { useWindowClass } from './use-window-class';

/**
 * Scroll height for a sheet or dialog body. Derived from the live window so a
 * landscape phone gets a short body and a desktop window a tall one, instead of
 * a fixed viewport fraction that only suits one form factor. The overlay's own
 * chrome is discounted: what is left over is what the body may scroll in.
 */
export function useOverlayBodyHeight(): number {
  const { height } = useWindowClass();
  const available = height - OVERLAY_CHROME_HEIGHT;
  return Math.round(Math.max(OVERLAY_BODY_MIN_HEIGHT, Math.min(height * OVERLAY_BODY_HEIGHT_RATIO, available)));
}
