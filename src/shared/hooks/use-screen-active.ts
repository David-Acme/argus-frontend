import { useIsFocused } from 'expo-router';
import { useAppActive } from './use-app-active';

export function useScreenActive(): boolean {
  const focused = useIsFocused();
  const appActive = useAppActive();
  return focused && appActive;
}
