import { useMemo, useSyncExternalStore } from 'react';
import { Dimensions } from 'react-native';
import type { Orientation, WindowClass, WindowHeightClass } from '@/core/types';
import { IS_NATIVE, WINDOW_EXPANDED_MIN, WINDOW_MEDIUM_MIN, WINDOW_TALL_MIN } from '@/shared/constants';

type WindowClassification = {
  windowClass: WindowClass;
  heightClass: WindowHeightClass;
  orientation: Orientation;
};

type WindowClassResult = WindowClassification & {
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  isWide: boolean;
  isShort: boolean;
  isLandscape: boolean;
  usesNavRail: boolean;
};

export function classifyWindow(width: number, height: number): WindowClassification {
  return {
    windowClass:
      width >= WINDOW_EXPANDED_MIN ? 'expanded' : width >= WINDOW_MEDIUM_MIN ? 'medium' : 'compact',
    heightClass: height >= WINDOW_TALL_MIN ? 'tall' : 'short',
    orientation: width > height ? 'landscape' : 'portrait',
  };
}

const subscribe = (listener: () => void) => {
  const subscription = Dimensions.addEventListener('change', listener);
  return () => subscription.remove();
};

const windowNow = () => {
  const { width, height } = Dimensions.get('window');
  return classifyWindow(width, height);
};

let current = windowNow();

const snapshot = (): WindowClassification => {
  const next = windowNow();
  if (
    next.windowClass !== current.windowClass ||
    next.heightClass !== current.heightClass ||
    next.orientation !== current.orientation
  ) {
    current = next;
  }
  return current;
};

export function useWindowClass(): WindowClassResult {
  const classification = useSyncExternalStore(subscribe, snapshot, snapshot);

  return useMemo(() => {
    const { windowClass, heightClass, orientation } = classification;
    return {
      windowClass,
      heightClass,
      orientation,
      isCompact: windowClass === 'compact',
      isMedium: windowClass === 'medium',
      isExpanded: windowClass === 'expanded',
      isWide: windowClass !== 'compact',
      isShort: heightClass === 'short',
      isLandscape: orientation === 'landscape',
      usesNavRail:
        windowClass === 'expanded' || (windowClass !== 'compact' && (heightClass === 'short' || !IS_NATIVE)),
    };
  }, [classification]);
}
