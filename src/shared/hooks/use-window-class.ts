import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import type { Orientation, WindowClass, WindowHeightClass } from '@/core/types';
import { IS_NATIVE, WINDOW_EXPANDED_MIN, WINDOW_MEDIUM_MIN, WINDOW_TALL_MIN } from '@/shared/constants';

type WindowClassResult = {
  windowClass: WindowClass;
  heightClass: WindowHeightClass;
  orientation: Orientation;
  width: number;
  height: number;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isWide: boolean;
  isShort: boolean;
  isLandscape: boolean;
  usesNavRail: boolean;
};

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
      usesNavRail:
        windowClass === 'expanded' ||
        (windowClass !== 'compact' && (heightClass === 'short' || !IS_NATIVE)),
    }),
    [windowClass, heightClass, orientation, width, height]
  );
}
