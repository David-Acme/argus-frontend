import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import type { Orientation, WindowClass, WindowHeightClass } from '@/core/types';
import { WINDOW_EXPANDED_MIN, WINDOW_MEDIUM_MIN, WINDOW_TALL_MIN } from '@/shared/constants';

type WindowClassResult = {
  windowClass: WindowClass;
  heightClass: WindowHeightClass;
  orientation: Orientation;
  width: number;
  height: number;
  /** Convenience flags so callers avoid string comparisons in JSX. */
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  /** True from `medium` up: two columns fit. */
  isWide: boolean;
  /** True when vertical room is scarce — a phone in landscape, mostly. */
  isShort: boolean;
  isLandscape: boolean;
  /**
   * Navigation goes to a side rail instead of the floating bar: on a desktop
   * window because there is room, and on a short wide one because a bottom bar
   * would eat a fifth of the height.
   */
  usesNavRail: boolean;
};

/** Exported so non-React callers share the thresholds. */
export function classifyWindow(width: number, height: number): {
  windowClass: WindowClass;
  heightClass: WindowHeightClass;
  orientation: Orientation;
} {
  return {
    windowClass:
      width >= WINDOW_EXPANDED_MIN ? 'expanded' : width >= WINDOW_MEDIUM_MIN ? 'medium' : 'compact',
    heightClass: height >= WINDOW_TALL_MIN ? 'tall' : 'short',
    orientation: width > height ? 'landscape' : 'portrait',
  };
}

/**
 * Classes from the live window size, so phone, tablet and desktop are decided
 * by dimensions and never by platform. Height matters too: a rotated phone is
 * `medium` wide but only ~360dp tall.
 */
export function useWindowClass(): WindowClassResult {
  const { width, height } = useWindowDimensions();
  const { windowClass, heightClass, orientation } = classifyWindow(width, height);

  return useMemo(
    () => ({
      windowClass,
      heightClass,
      orientation,
      width,
      height,
      isCompact: windowClass === 'compact',
      isMedium: windowClass === 'medium',
      isExpanded: windowClass === 'expanded',
      isWide: windowClass !== 'compact',
      isShort: heightClass === 'short',
      isLandscape: orientation === 'landscape',
      usesNavRail: windowClass === 'expanded' || (heightClass === 'short' && windowClass !== 'compact'),
    }),
    [windowClass, heightClass, orientation, width, height]
  );
}
