import { useKeyboardState } from 'react-native-keyboard-controller';
import { useKeyboardTruth } from '@/shared/hooks/use-keyboard-truth';

export function useKeyboardInset(): number {
  const shown = useKeyboardTruth();
  const height = useKeyboardState((state) => (state.isVisible ? state.height : 0));
  return shown ? height : 0;
}
