import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Circle, Svg } from 'react-native-svg';
import { motion, size, useEffects, useThemeTokens } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { BUFFERING_DELAY_MS, type SeekStreak } from './player-model';

export type PlayerSpinnerProps = { shown: boolean; label: string };

export type SeekRippleProps = { streak: SeekStreak; label: string };

const SPINNER_STROKE = 3;

const SPINNER_TURN_MS = 900;

const ARC = 0.7;

export function useDelayedFlag(flag: boolean, delayMs: number = BUFFERING_DELAY_MS): boolean {
  const [shown, setShown] = useState(false);
  const [seen, setSeen] = useState(flag);
  if (seen !== flag) {
    setSeen(flag);
    setShown(false);
  }
  useEffect(() => {
    if (!flag) return undefined;
    const timer = setTimeout(() => setShown(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, flag]);
  return flag && shown;
}

function SpinnerArc() {
  const { color } = useThemeTokens();
  const { reduceMotion } = useEffects();
  const turn = useSharedValue(0);
  const radius = (size.playerSpinner - SPINNER_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  useEffect(() => {
    if (reduceMotion) return;
    turn.set(withRepeat(withTiming(1, { duration: SPINNER_TURN_MS, easing: Easing.linear }), -1));
  }, [reduceMotion, turn]);
  return (
    <Animated.View style={spin}>
      <Svg width={size.playerSpinner} height={size.playerSpinner}>
        <Circle
          cx={size.playerSpinner / 2}
          cy={size.playerSpinner / 2}
          r={radius}
          stroke={color.accent}
          strokeWidth={SPINNER_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${circumference * ARC} ${circumference}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
}

export function PlayerSpinner({ shown, label }: PlayerSpinnerProps) {
  const visible = useDelayedFlag(shown);
  if (!visible) return null;
  return (
    <Animated.View
      role="progressbar"
      aria-label={label}
      entering={FadeIn.duration(motion.duration.base)}
      exiting={FadeOut.duration(motion.duration.fast)}
      className="pointer-events-none absolute inset-0 items-center justify-center">
      <SpinnerArc />
    </Animated.View>
  );
}

export function SeekRipple({ streak, label }: SeekRippleProps) {
  const forward = streak.side === 'forward';
  return (
    <Animated.View
      key={`${streak.side}:${streak.count}`}
      entering={FadeIn.duration(motion.duration.fast)}
      exiting={FadeOut.duration(motion.duration.base)}
      className={`pointer-events-none absolute top-0 bottom-0 w-1/3 items-center justify-center ${forward ? 'right-0' : 'left-0'}`}>
      <View className="size-seek-ripple bg-scrim-soft items-center justify-center rounded-full">
        <Text variant="mediaLabel" tone="on-media">
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}
