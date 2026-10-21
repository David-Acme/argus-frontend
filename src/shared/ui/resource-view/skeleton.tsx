import { clsx } from 'clsx';
import { useContext } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { motion, useEffects } from '@/shared/theme';
import { RowPosition } from '@/shared/ui/row';

export type SkeletonShape = 'well' | 'title' | 'meta' | 'short' | 'brief' | 'pill' | 'button';

export type SkeletonProps = { shape: SkeletonShape };

export type SkeletonRowProps = { trailing?: boolean; short?: boolean };

const SHAPE: Record<SkeletonShape, string> = {
  well: 'size-well rounded-well',
  title: 'h-skel-line w-3/5 rounded-sm',
  meta: 'h-skel-meta w-2/5 rounded-sm',
  short: 'h-skel-line w-1/2 rounded-sm',
  brief: 'h-skel-meta w-1/3 rounded-sm',
  pill: 'h-skel-pill-height w-skel-pill rounded-full',
  button: 'h-button w-full rounded-button',
};

const SHIMMER = {
  animationName: { '0%': { opacity: 0 }, '50%': { opacity: 1 }, '100%': { opacity: 0 } },
  animationDuration: motion.loop.shimmer,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'linear',
} as const;

export function Skeleton({ shape }: SkeletonProps) {
  const { reduceMotion } = useEffects();
  return (
    <View aria-hidden className={clsx('bg-skel overflow-hidden', SHAPE[shape])}>
      {reduceMotion ? null : (
        <Animated.View className="bg-skel-2 absolute inset-0" style={SHIMMER} />
      )}
    </View>
  );
}

export function SkeletonRow({ trailing, short }: SkeletonRowProps) {
  const { index } = useContext(RowPosition);
  return (
    <View className="min-h-row gap-row-gap px-row-x py-row-y flex-row items-center">
      {index > 0 ? (
        <View className="right-row-x left-row-x border-line absolute top-0 border-t" />
      ) : null}
      <Skeleton shape="well" />
      <View className="gap-skeleton-line-gap min-w-0 flex-1">
        <Skeleton shape={short ? 'short' : 'title'} />
        <Skeleton shape={short ? 'brief' : 'meta'} />
      </View>
      {trailing ? <Skeleton shape="pill" /> : null}
    </View>
  );
}
