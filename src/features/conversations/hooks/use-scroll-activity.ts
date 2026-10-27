import { useRef } from 'react';
import {
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scrollArmOf } from '@/features/conversations/model/thread-list';

export type ScrollActivity = { shown: SharedValue<number>; touch: () => void };

export type ScrollActivityInput = { holdMs: number; reduceMotion: boolean };

export function useScrollActivity({ holdMs, reduceMotion }: ScrollActivityInput): ScrollActivity {
  const shown = useSharedValue(0);
  const armedAt = useRef(Number.NEGATIVE_INFINITY);

  const touch = () => {
    const at = performance.now();
    const arm = scrollArmOf({ sinceArm: at - armedAt.current, holdMs, reduceMotion });
    if (!arm) return;
    armedAt.current = at;
    shown.set(
      withSequence(
        withTiming(1, { duration: arm.enter }),
        withTiming(1, { duration: arm.hold }),
        withTiming(0, { duration: arm.leave })
      )
    );
  };

  return { shown, touch };
}
