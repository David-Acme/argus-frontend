import { useWindowDimensions } from 'react-native';
import { layout } from './tokens';
import { classifyWindowSize, type WindowLayout } from './window-layout';

export function useWindowLayout(): WindowLayout {
  const { width, height } = useWindowDimensions();
  return classifyWindowSize({ width, height });
}

export function useWindowHeight(): number {
  return useWindowDimensions().height;
}

export function useFourColumns(): boolean {
  return useWindowDimensions().width >= layout.fourColumns;
}
