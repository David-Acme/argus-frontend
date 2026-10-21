import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { motion, useEffects, useThemeTokens } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';

export type ScreenBack = { label: string; onPress: () => void };

export type ScreenTopBarProps = {
  title?: string;
  meta?: string;
  back?: ScreenBack;
  actions?: ReactNode;
  updating?: string;
};

type UpdatingProps = { label: string };

const PULSE = {
  animationName: { from: { opacity: 1 }, to: { opacity: motion.pulseOpacity } },
  animationDuration: `${motion.pulseSeconds / 2}s`,
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as const;

function Updating({ label }: UpdatingProps) {
  const { reduceMotion, reduceTransparency } = useEffects();
  const { elevation } = useThemeTokens();
  const ring = { boxShadow: elevation.glassInset };
  return (
    <View
      style={ring}
      accessibilityLiveRegion="polite"
      className={clsx(
        'px-screen-pill-x py-screen-pill-y gap-screen-pill-gap flex-row items-center rounded-full',
        reduceTransparency ? 'bg-surface' : 'bg-glass'
      )}>
      <Animated.View
        className="size-live-dot bg-accent-fill rounded-full"
        style={reduceMotion ? undefined : PULSE}
      />
      <Text variant="count" tone="3">
        {label}
      </Text>
    </View>
  );
}

export function ScreenTopBar({ title, meta, back, actions, updating }: ScreenTopBarProps) {
  return (
    <View
      className={clsx(
        'py-screen-bar-y flex-row items-center gap-2',
        title ? 'min-h-top-bar' : 'min-h-top-bar-compact'
      )}>
      {back ? (
        <Button iconOnly glass icon="back" label={back.label} onPress={back.onPress} />
      ) : null}
      <View className="min-w-0 flex-1">
        {title ? (
          <Text variant="title" heading numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {meta ? <Text variant={title ? 'meta' : 'greeting'}>{meta}</Text> : null}
      </View>
      {updating ? <Updating label={updating} /> : null}
      {actions}
    </View>
  );
}
