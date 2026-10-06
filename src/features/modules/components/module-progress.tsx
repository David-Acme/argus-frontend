import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { ModuleJob } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { percentOf, progressLine } from '@/features/modules/model/module-text';

type ModuleProgressProps = {
  job: ModuleJob;
  compact?: boolean;
  className?: string;
};

const FILL: Partial<Record<ModuleJob['state'], string>> = {
  paused: 'bg-warning',
  failed: 'bg-error',
  done: 'bg-success',
  cancelled: 'bg-border',
};

export function ModuleProgress({ job, compact = false, className }: ModuleProgressProps) {
  const { t, language } = useTranslation();
  const reduceMotion = useReduceMotion();
  const percent = job.state === 'done' ? 100 : percentOf(job.progress);
  const width = useSharedValue(percent);
  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  const line = progressLine(job, language, t);

  useEffect(() => {
    width.value = reduceMotion ? percent : withTiming(percent, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [percent, reduceMotion, width]);

  return (
    <View
      className={cn('gap-1.5', className)}
      accessibilityRole="progressbar"
      accessibilityLabel={line}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      aria-live="polite">
      <View className="flex-row items-center gap-3">
        <View className="bg-surface-secondary dark:bg-border h-2 flex-1 overflow-hidden rounded-full">
          <Animated.View className={cn('h-full rounded-full', FILL[job.state] ?? 'bg-accent')} style={fillStyle} />
        </View>
        <Text variant="label" className="min-w-10 text-right tabular-nums">
          {`${percent} %`}
        </Text>
      </View>
      {compact ? null : (
        <Text variant="caption" className="text-foreground-secondary tabular-nums" numberOfLines={2}>
          {line}
        </Text>
      )}
    </View>
  );
}
