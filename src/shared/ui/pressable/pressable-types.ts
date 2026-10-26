import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { FeedbackKind } from '@/core/types';
import type { PressScaleKind } from '@/shared/theme';

export type SurfaceRole = 'button' | 'link' | 'switch' | 'checkbox' | 'tab' | 'radio';

export type SurfaceAccessibility = {
  label: string;
  role: SurfaceRole;
  checked?: boolean | 'mixed';
  selected?: boolean;
  busy?: boolean;
  tabStop?: boolean;
};

export type SurfacePressed = { scale?: PressScaleKind; fill?: boolean; grow?: boolean };

export type PressableSurfaceProps = {
  a11y: SurfaceAccessibility;
  onPress?: () => void;
  haptic?: FeedbackKind;
  pressed?: SurfacePressed;
  disabled?: boolean;
  hitSlop?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
};
