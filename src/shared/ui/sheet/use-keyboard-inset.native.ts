import { useKeyboardState } from 'react-native-keyboard-controller';

export function useKeyboardInset(): number {
  return useKeyboardState((state) => (state.isVisible ? state.height : 0));
}
