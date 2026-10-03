import { colorTokens, MORPH_ICONS } from '@/shared/constants';
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
  spring?: SpringPreset;
  reducedMotion?: ReducedMotionMode;
  label?: string;
};

export const MorphIcon = forwardRef<MorphHandle, MorphIconProps>(
  (
    {
      name,
      size = 24,
      color = colorTokens.light.foreground,
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