import { clsx } from 'clsx';
import { useRef } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { feedback, motion, size } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { useSingleFlight, type FlightAction } from './use-single-flight';

export type ButtonHold = { onHold: FlightAction; hint: string };

export type HoldButtonProps = {
  hold: ButtonHold;
  label: string;
  onPress: FlightAction;
  compact?: boolean;
};

const ACTIONS = [{ name: 'longpress' as const }];

const ORIGIN = { transformOrigin: 'left' } as const;

const COMPACT_SLOP = (size.target - size.targetMin) / 2;

function tick(step: number) {
  feedback(step >= motion.holdTicks ? 'warning' : 'selection');
}

function useHoldProgress(onDone: () => void) {
  const progress = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  useAnimatedReaction(
    () => Math.floor(progress.get() * motion.holdTicks),
    (step, previous) => {
      if (previous !== null && step > previous && step > 0) scheduleOnRN(tick, step);
    }
  );
  const start = () =>
    progress.set(
      withTiming(1, { duration: motion.holdConfirm }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      })
    );
  const stop = () => {
    cancelAnimation(progress);
    progress.set(withTiming(0, { duration: motion.duration.fast }));
  };
  return { fill, start, stop };
}

export function HoldButton({ hold, label, onPress, compact }: HoldButtonProps) {
  const held = useRef(false);
  const tap = useSingleFlight(onPress, false);
  const fire = useSingleFlight(hold.onHold, false);
  const complete = () => {
    held.current = true;
    fire.run();
  };
  const progress = useHoldProgress(complete);
  const busy = tap.busy || fire.busy;
  return (
    <Pressable
      role="button"
      aria-label={label}
      aria-busy={busy}
      accessibilityHint={hold.hint}
      accessibilityActions={ACTIONS}
      onAccessibilityAction={complete}
      disabled={busy}
      hitSlop={compact ? COMPACT_SLOP : undefined}
      onPressIn={() => {
        held.current = false;
        progress.start();
      }}
      onPressOut={progress.stop}
      onPress={() => {
        if (!held.current) tap.run();
      }}
      className={clsx(
        'web:focus-ring web:hover-dim bg-alert-soft relative flex-row items-center justify-center overflow-hidden',
        compact
          ? 'min-h-button-compact rounded-control px-button-compact-x'
          : 'min-h-button rounded-button px-button-x'
      )}>
      <Animated.View
        aria-hidden
        className="bg-alert absolute inset-0 opacity-20"
        style={[ORIGIN, progress.fill]}
      />
      <View className="flex-row items-center">
        <Text variant={compact ? 'buttonCompact' : 'button'} tone="alert">
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
