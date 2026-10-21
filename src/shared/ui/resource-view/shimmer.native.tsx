import { createContext, useContext, useEffect, type ReactNode } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useScreenActive } from '@/shared/hooks/use-screen-active';
import { motion, useEffects } from '@/shared/theme';
import { SHIMMER, SHIMMER_STILL } from './shimmer-style';

export type ShimmerProviderProps = { children: ReactNode };

const Shimmer = createContext<SharedValue<number> | null>(null);

const REST = motion.loop.shimmerRest;

const QUARTER = { duration: motion.loop.shimmer / 4, easing: Easing.linear };

const HALF = { duration: motion.loop.shimmer / 2, easing: Easing.linear };

export function ShimmerProvider({ children }: ShimmerProviderProps) {
  const { reduceMotion } = useEffects();
  const active = useScreenActive();
  const opacity = useSharedValue<number>(REST);
  useEffect(() => {
    if (reduceMotion || !active) {
      cancelAnimation(opacity);
      opacity.set(REST);
      return;
    }
    opacity.set(
      withRepeat(
        withSequence(withTiming(1, QUARTER), withTiming(0, HALF), withTiming(REST, QUARTER)),
        -1
      )
    );
  }, [reduceMotion, active, opacity]);
  return <Shimmer.Provider value={opacity}>{children}</Shimmer.Provider>;
}

export function useShimmerStyle() {
  const shared = useContext(Shimmer);
  const { reduceMotion } = useEffects();
  const driven = useAnimatedStyle(() => ({ opacity: shared ? shared.get() : REST }));
  if (shared) return driven;
  return reduceMotion ? SHIMMER_STILL : SHIMMER;
}
