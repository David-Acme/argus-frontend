import { useWindowDimensions } from 'react-native';
import { classifyWindowSize, type WindowLayout } from './window-layout';

export function useWindowLayout(): WindowLayout {
  const { width, height } = useWindowDimensions();
  return classifyWindowSize({ width, height });
}
