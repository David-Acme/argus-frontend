import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { KeyboardController, KeyboardEvents } from 'react-native-keyboard-controller';
import { watchKeyboardTruth } from '@/shared/hooks/use-keyboard-truth/keyboard-truth';
import type { KeyboardSources, Subscription } from '@/shared/hooks/use-keyboard-truth/keyboard-truth';

const both = (first: Subscription, second: Subscription): Subscription => ({
  remove: () => {
    first.remove();
    second.remove();
  },
});

const SOURCES: KeyboardSources = {
  onShow: (listener) => KeyboardEvents.addListener('keyboardWillShow', listener),
  onHide: (listener) => KeyboardEvents.addListener('keyboardDidHide', listener),
  onLeave: (listener) =>
    both(
      AppState.addEventListener('blur', listener),
      AppState.addEventListener('change', (state) => {
        if (state !== 'active') listener();
      })
    ),
  onReturn: (listener) =>
    both(
      AppState.addEventListener('focus', listener),
      AppState.addEventListener('change', (state) => {
        if (state === 'active') listener();
      })
    ),
  dismiss: () => void KeyboardController.dismiss(),
};

export function useKeyboardTruth(): boolean {
  const [shown, setShown] = useState(() => KeyboardController.isVisible());
  useEffect(() => watchKeyboardTruth(SOURCES, setShown), []);
  return shown;
}
