import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { KeyboardController, KeyboardEvents } from 'react-native-keyboard-controller';
import { stickyKeyboardStep } from '@/features/conversations/model/thread-list';

export function useStickyKeyboard(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const shown = KeyboardEvents.addListener('keyboardWillShow', () =>
      setEnabled((current) => stickyKeyboardStep(current, 'show', true))
    );
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        void KeyboardController.dismiss();
        setEnabled((current) => stickyKeyboardStep(current, 'leave', false));
      }
      if (state === 'active')
        setEnabled((current) =>
          stickyKeyboardStep(current, 'resume', KeyboardController.isVisible())
        );
    });
    return () => {
      shown.remove();
      app.remove();
    };
  }, []);

  return enabled;
}
