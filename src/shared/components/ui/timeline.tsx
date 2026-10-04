import type { ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '@/shared/libs/utils';

type TimelineItemProps = {
  last?: boolean;
  dotClassName?: string;
  className?: string;
  children: ReactNode;
};

export function TimelineItem({
  last = false,
  dotClassName,
  className,
  children,
}: TimelineItemProps) {
  return (
    <View className="flex-row gap-3">
      <View className="w-3 items-center">
        <View className={cn('bg-muted-foreground mt-1.5 size-2 rounded-full', dotClassName)} />
        {last ? null : <View className="bg-border-subtle mt-1 w-px flex-1" />}
      </View>
      <View className={cn('min-w-0 flex-1', !last && 'pb-3', className)}>{children}</View>
    </View>
  );
}
