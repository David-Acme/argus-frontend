import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { illustration, inset, motion, size, useEffects, useThemeTokens } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';

export type SwitchProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  testID?: string;
};

const TRAVEL = size.switchWidth - size.switchThumb - inset.control.switchThumb * 2;

const SLOP = (size.target - size.switchHeight) / 2;

export function Switch({ value, onValueChange, label, disabled, testID }: SwitchProps) {
  const { reduceMotion } = useEffects();
  const { color, elevation } = useThemeTokens();
  const track = { boxShadow: elevation.ringInset };
  const offset = useSharedValue(value ? TRAVEL : 0);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  useEffect(() => {
    const target = value ? TRAVEL : 0;
    offset.set(reduceMotion ? target : withSpring(target, motion.spring.snappy));
  }, [offset, reduceMotion, value]);
  return (
    <PressableSurface
      a11y={{ label, role: 'switch', checked: value }}
      onPress={() => onValueChange(!value)}
      haptic="selection"
      disabled={disabled}
      hitSlop={SLOP}
      testID={testID}
      className={
        value
          ? 'h-switch-height w-switch-width bg-ink rounded-full'
          : 'h-switch-height w-switch-width bg-fill-press rounded-full'
      }
      style={track}>
      <Animated.View
        className="top-control-switch-thumb left-control-switch-thumb size-switch-thumb absolute rounded-full"
        style={[
          thumbStyle,
          {
            backgroundColor: value ? color['on-ink'] : illustration.switchThumb,
            boxShadow: elevation.thumb,
          },
        ]}
      />
    </PressableSurface>
  );
}
