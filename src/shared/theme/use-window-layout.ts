import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { classifyWindowSize, type WindowLayout } from './window-layout';

export function useWindowLayout(): WindowLayout {
  const { width, height } = useWindowDimensions();
  const { windowClass, navigation } = classifyWindowSize({ width, height });
  return useMemo(() => ({ windowClass, navigation }), [windowClass, navigation]);
}
