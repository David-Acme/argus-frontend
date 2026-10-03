import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { MosaicChart } from './mosaic-chart';

type ActivityCardProps = {
  title: string;
  delta: string;
  direction?: 'up' | 'down' | 'flat';
  levels?: readonly (readonly number[])[];
  action?: string;
  className?: string;
  onAction?: () => void;
};

const TREND_ICON = {
  up: 'trending-up',
  down: 'trending-down',
  flat: 'activity',
} as const;

const TREND_TONE = {
  up: 'text-success',
  down: 'text-error-strong',
  flat: 'text-muted-foreground',
} as const;

export function ActivityCard({
  title,
  delta,
  direction = 'flat',
  levels,
  action,
  onAction,
  className,
}: ActivityCardProps) {
  return (
    <View className={cn('bg-card justify-center overflow-hidden rounded-[26px] p-4 shadow-md shadow-black/[0.07]', className)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-3">
          <Text className="text-subhead font-semibold leading-[22px]">{title}</Text>
          {action ? (
            <Button size="sm" className="self-start rounded-full px-4" onPress={onAction}>
              <Text className="text-caption font-semibold">{action}</Text>
            </Button>
          ) : null}
        </View>
        <View className="items-end gap-2">
          <View className="bg-surface-secondary flex-row items-center gap-1 rounded-full px-2.5 py-1">
            <Icon name={TREND_ICON[direction]} className={cn('size-3', TREND_TONE[direction])} />
            <Text className="text-foreground text-micro font-semibold tabular-nums">{delta}</Text>
          </View>
          <MosaicChart levels={levels} />
        </View>
      </View>
    </View>
  );
}
