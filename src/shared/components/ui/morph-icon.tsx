import { MORPH_ICONS } from '@/shared/constants';
import type { MorphIconName } from '@/core/types';
import {
  MorphIcon as BaseMorphIcon,
  type MorphHandle,
  type ReducedMotionMode,
  type SpringPreset,
} from 'morphicons/react-native';
import { forwardRef } from 'react';

type MorphIconProps = {
  name: MorphIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Physics for uncontrolled/imperative mode. */
  spring?: SpringPreset;
  /** Honors the OS reduce-motion setting (morphs become instant swaps). */
  reducedMotion?: ReducedMotionMode;
  label?: string;
};

/**
 * Animated icon wrapper around `morphicons/react-native`. The per-frame `d`
 * updates go through `setNativeProps` of react-native-svg — outside the React
 * render — with a single shared rAF, so an active morph costs almost nothing
 * on low-end Android. The ref exposes `morphTo(icon)` / `set(icon)`.
 */
export const MorphIcon = forwardRef<MorphHandle, MorphIconProps>(
  (
    {
      name,
      size = 24,
      color = '#161616',
      strokeWidth = 2,
      spring = 'smooth',
      reducedMotion = 'user',
      label,
    },
    ref,
  ) => (
    <BaseMorphIcon
      ref={ref}
      icon={MORPH_ICONS[name]}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      spring={spring}
      reducedMotion={reducedMotion}
      label={label}
    />
  ),
);

MorphIcon.displayName = 'MorphIcon';

export type { MorphHandle };
export type { MorphIconProps };