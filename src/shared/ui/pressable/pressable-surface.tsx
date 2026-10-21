import { clsx } from 'clsx';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import type { PressableSurfaceProps } from './pressable-types';
import { useSurfacePress } from './use-surface-press';

export function PressableSurface({
  a11y,
  onPress,
  haptic,
  pressed,
  disabled,
  hitSlop,
  className,
  style,
  testID,
  children,
}: PressableSurfaceProps) {
  const press = useSurfacePress({ onPress, haptic, pressed, disabled, style });
  return (
    <Animated.View style={press.scaleStyle}>
      <Pressable
        role={a11y.role}
        aria-label={a11y.label}
        aria-checked={a11y.checked}
        aria-selected={a11y.selected}
        aria-busy={a11y.busy}
        aria-disabled={disabled}
        disabled={disabled}
        hitSlop={hitSlop}
        onPress={press.onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        testID={testID}
        className={clsx(
          'web:focus-ring',
          pressed?.fill && 'web:hover:bg-fill',
          hitSlop && 'web:hit-target',
          className
        )}
        style={press.surfaceStyle}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
