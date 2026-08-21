import { OVERLAY_BODY_HEIGHT_RATIO } from '@/shared/constants';
import { useWindowClass } from './use-window-class';

/**
 * Scroll height for a sheet or dialog body. Derived from the live window so a
 * landscape phone gets a short body and a desktop window a tall one, instead of
 * a fixed viewport fraction that only suits one form factor.
 */
export function useOverlayBodyHeight(): number {
  const { height } = useWindowClass();
  return Math.round(height * OVERLAY_BODY_HEIGHT_RATIO);
}
