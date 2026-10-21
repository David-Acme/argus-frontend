import { useState } from 'react';
import { feedback, state as states, usePressScale, useThemeTokens } from '@/shared/theme';
import type { PressableSurfaceProps } from './pressable-types';

type SurfacePressInput = Pick<
  PressableSurfaceProps,
  'onPress' | 'haptic' | 'pressed' | 'disabled' | 'style'
>;

export function useSurfacePress({ onPress, haptic, pressed, disabled, style }: SurfacePressInput) {
  const { color } = useThemeTokens();
  const scale = usePressScale(pressed?.scale ?? 'surface');
  const [down, setDown] = useState(false);
  const scales = pressed?.scale !== undefined && !disabled;
  return {
    scaleStyle: scale.style,
    surfaceStyle: [
      style,
      down && pressed?.fill ? { backgroundColor: color.fill } : null,
      disabled ? { opacity: states.disabledOpacity } : null,
    ],
    onPressIn: () => {
      setDown(true);
      if (scales) scale.onPressIn();
    },
    onPressOut: () => {
      setDown(false);
      scale.onPressOut();
    },
    onPress: () => {
      if (disabled || !onPress) return;
      if (haptic) feedback(haptic);
      onPress();
    },
  };
}
