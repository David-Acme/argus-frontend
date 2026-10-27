import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import { motion, useEffects } from '@/shared/theme';
import { useGrowsInColumn } from '@/shared/ui/screen/screen-column-context';

export type SurfaceSlotProps = { children: ReactNode };

const ENTER = FadeIn.duration(motion.duration.slow);

const EXIT = FadeOut.duration(motion.duration.base);

const SETTLE = LinearTransition.duration(motion.duration.slow);

const GROW = { flexGrow: 1 };

export function SurfaceGroup({ children }: SurfaceSlotProps) {
  return (
    <LayoutAnimationConfig skipEntering skipExiting>
      {children}
    </LayoutAnimationConfig>
  );
}

export function SurfaceSlot({ children }: SurfaceSlotProps) {
  const { reduceMotion } = useEffects();
  const grows = useGrowsInColumn();
  if (reduceMotion) return <View style={grows ? GROW : undefined}>{children}</View>;
  return (
    <Animated.View entering={ENTER} exiting={EXIT} layout={SETTLE} style={grows ? GROW : undefined}>
      {children}
    </Animated.View>
  );
}
