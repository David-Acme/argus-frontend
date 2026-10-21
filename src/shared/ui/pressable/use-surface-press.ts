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
    },
    onPressOut: () => {
      if (fills) setDown(false);
      scale.onPressOut();
    },
    onPress: () => {
      if (disabled || !onPress) return;
      if (haptic) feedback(haptic);
      onPress();
    },
  };
}
