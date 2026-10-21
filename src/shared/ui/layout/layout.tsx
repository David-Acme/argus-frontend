import { clsx } from 'clsx';
import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import type { space } from '@/shared/theme';

export type Gap = keyof typeof space;

export type StackProps = { gap?: Gap; align?: 'stretch' | 'start' | 'center'; children: ReactNode };

export type InlineProps = {
  gap?: Gap;
  align?: 'center' | 'baseline' | 'start';
  justify?: 'start' | 'between' | 'center' | 'end';
  fill?: boolean;
  children: ReactNode;
};

export type ClusterProps = { gap?: Gap; justify?: 'start' | 'center'; children: ReactNode };

const GAP: Record<Gap, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
  12: 'gap-12',
};

const ALIGN = {
  stretch: 'items-stretch',
  start: 'items-start',
  center: 'items-center',
  baseline: 'items-baseline',
} as const;

const JUSTIFY = {
  start: 'justify-start',
  between: 'justify-between',
  center: 'justify-center',
  end: 'justify-end',
} as const;

export function Stack({ gap = 3, align = 'stretch', children }: StackProps) {
  return <View className={clsx('flex-col', GAP[gap], ALIGN[align])}>{children}</View>;
}

export function Inline({
  gap = 2,
  align = 'center',
  justify = 'start',
  fill,
  children,
}: InlineProps) {
  return (
    <View className={clsx('flex-row', GAP[gap], ALIGN[align], JUSTIFY[justify])}>
      {fill
        ? Children.toArray(children).map((child, index) => (
            <View key={index} className="min-w-0 flex-1">
              {child}
            </View>
          ))
        : children}
    </View>
  );
}

export function Cluster({ gap = 2, justify = 'start', children }: ClusterProps) {
  return (
    <View className={clsx('flex-row flex-wrap items-center', GAP[gap], JUSTIFY[justify])}>
      {children}
    </View>
  );
}
