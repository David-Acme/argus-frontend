import { useRef, useState } from 'react';
import { feedback, state as states, usePressScale, useThemeTokens } from '@/shared/theme';
import type { PressableSurfaceProps } from '@/shared/ui/pressable/pressable-types';

type SurfacePressInput = Pick<
  PressableSurfaceProps,
  'onPress' | 'haptic' | 'pressed' | 'hold' | 'disabled' | 'style'
>;

export function useSurfacePress({
  onPress,
  haptic,
  pressed,
  hold,
  disabled,
  style,
}: SurfacePressInput) {
  const { color } = useThemeTokens();
  const scale = usePressScale(pressed?.scale ?? 'surface');
  const [down, setDown] = useState(false);
  const held = useRef(false);
  const scales = pressed?.scale !== undefined && !disabled;
  const fills = pressed?.fill === true;
  return {
    scaleStyle: scale.style,
    surfaceStyle: [
      style,
      down && fills ? { backgroundColor: color.fill } : null,
      disabled ? { opacity: states.disabledOpacity } : null,
    ],
    onPressIn: () => {
      if (fills) setDown(true);
      if (scales) scale.onPressIn();
      if (!hold || disabled) return;
      held.current = true;
      hold.onStart();
    },
    onPressOut: () => {
      if (fills) setDown(false);
      scale.onPressOut();
      if (!hold || !held.current) return;
      held.current = false;
      hold.onEnd();
    },
    onPress: () => {
      if (disabled || !onPress) return;
      if (haptic) feedback(haptic);
      onPress();
    },
  };
}
