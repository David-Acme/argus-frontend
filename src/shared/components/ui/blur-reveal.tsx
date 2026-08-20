import { IS_WEB } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const BLUR_INITIAL_PX = 14;
const EASE_OUT = Easing.out(Easing.cubic);

type BlurRevealProps = {
  delay?: number;
  duration?: number;
  /** Blur-to-sharp effect (texts). Defaults to true. */
  blur?: boolean;
  /** Gentle scale-up on entry (buttons). */
  scale?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Entry reveal driven by shared values, so it behaves identically on native
 * and web. Reduced motion: plain fade only.
 */
export function BlurReveal({
  delay = 0,
  duration = 750,
  blur = true,
  scale = false,
  children,
  className,
}: BlurRevealProps) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: EASE_OUT }));
  }, [delay, duration, progress]);

  const style = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: progress.value };
    const blurPx = (1 - progress.value) * BLUR_INITIAL_PX;
    return {
      opacity: progress.value,
      ...(scale ? { transform: [{ scale: 0.96 + 0.04 * progress.value }] } : {}),
      ...(blur
        ? IS_WEB
          ? { filter: [{ blur: `${blurPx.toFixed(1)}px` }] }
          : { filter: [{ blur: blurPx }] }
        : {}),
    };
  });

  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}