import { IS_WEB } from '@/shared/constants';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { revealStyle } from '@/shared/components/ui/blur-reveal-style';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const EASE_OUT = Easing.out(Easing.cubic);

type BlurRevealProps = {
  delay?: number;
  duration?: number;
  blur?: boolean;
  scale?: boolean;
  children: ReactNode;
  className?: string;
};

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

  const style = useAnimatedStyle(() =>
    revealStyle({
      blur,
      scale,
      platform: IS_WEB ? 'web' : 'native',
      progress: progress.value,
      reduceMotion,
    })
  );

  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}
