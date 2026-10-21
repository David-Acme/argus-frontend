import { useCallback } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useEffects } from './effects';
import { motion } from './tokens';

export type PressScaleKind = 'surface' | 'icon';

const PRESSED: Record<PressScaleKind, number> = {
  surface: motion.pressScale,
  icon: motion.pressScaleIcon,
};

export function usePressScale(kind: PressScaleKind = 'surface') {
  const { reduceMotion } = useEffects();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const settle = useCallback(
    (target: number) => scale.set(reduceMotion ? target : withSpring(target, motion.spring.snappy)),
    [reduceMotion, scale]
  );
  const onPressIn = useCallback(
    () => settle(reduceMotion ? 1 : PRESSED[kind]),
    [kind, reduceMotion, settle]
  );
  const onPressOut = useCallback(() => settle(1), [settle]);
  return { style, onPressIn, onPressOut };
}
