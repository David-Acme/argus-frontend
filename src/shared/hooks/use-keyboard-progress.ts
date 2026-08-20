import { useState } from 'react';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { runOnJS, useAnimatedReaction, type SharedValue } from 'react-native-reanimated';

type KeyboardProgress = {
  offset: SharedValue<number>;
  progress: SharedValue<number>;
  visible: boolean;
  fullyOpen: boolean;
};

export function useKeyboardProgress(): KeyboardProgress {
  const { height, progress } = useReanimatedKeyboardAnimation();
  const [visible, setVisible] = useState(false);
  const [fullyOpen, setFullyOpen] = useState(false);

  useAnimatedReaction(
    () => progress.value > 0,
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setVisible)(next);
      }
    }
  );

  useAnimatedReaction(
    () => progress.value >= 1,
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setFullyOpen)(next);
      }
    }
  );

  return { offset: height, progress, visible, fullyOpen };
}
