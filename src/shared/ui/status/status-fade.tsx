import type { ReactNode } from 'react';
import Animated from 'react-native-reanimated';
import { motion, useEffects } from '@/shared/theme';

type StatusFadeProps = { change: string; grow?: boolean; children: ReactNode };

const FADE_IN = {
  animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
  animationDuration: motion.duration.base,
  animationTimingFunction: 'ease-out',
} as const;

export function StatusFade({ change, grow, children }: StatusFadeProps) {
  const { reduceMotion } = useEffects();
  return (
    <Animated.View
      key={change}
      className={grow ? 'min-w-0 flex-1' : 'min-w-0 shrink'}
      style={reduceMotion ? undefined : FADE_IN}>
      {children}
    </Animated.View>
  );
}
