import { useEffect, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { heightLayoutOf, layout, motion, paletteTopOf, useEffects } from '@/shared/theme';

type CommandPaletteProps = { children: ReactNode };

const [x1, y1, x2, y2] = motion.easing.overshoot;

const ENTER_FROM_SCALE = 0.97;

const ENTER = { duration: motion.duration.enter, easing: Easing.bezier(x1, y1, x2, y2) };

export const paletteWidth = (windowWidth: number): number =>
  Math.min(layout.palette, windowWidth - layout.gutterCompact * 2);

export const paletteHeight = (size: { width: number; height: number }): number =>
  size.height - paletteTopOf(heightLayoutOf(size)) * 2;

export function usePaletteHeight(): number {
  return paletteHeight(useWindowDimensions());
}

export function CommandPalette({ children }: CommandPaletteProps) {
  const { reduceMotion } = useEffects();
  const { width, height } = useWindowDimensions();
  const shown = useSharedValue(reduceMotion ? 1 : 0);
  const enter = useAnimatedStyle(() => ({
    opacity: Math.min(shown.get(), 1),
    transform: [{ scale: ENTER_FROM_SCALE + (1 - ENTER_FROM_SCALE) * shown.get() }],
  }));
  const frame = {
    width: paletteWidth(width),
    maxHeight: paletteHeight({ width, height }),
  };

  useEffect(() => {
    shown.set(withTiming(1, ENTER));
  }, [shown]);

  return (
    <Animated.View
      style={[frame, enter]}
      className="rounded-dialog border-line bg-surface overflow-hidden border">
      {children}
    </Animated.View>
  );
}
