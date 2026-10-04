import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { MosaicChart } from '@/features/home/components/activity/mosaic-chart';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';

type ActivityCardProps = {
  title: string;
  delta: string;
  direction?: 'up' | 'down' | 'flat';
  levels: readonly (readonly number[])[];
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
    <Panel className={cn('justify-center overflow-hidden', className)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-3">
          <Text className="text-subhead font-semibold leading-[22px]">{title}</Text>
          {action ? (
            <Button size="sm" className="self-start px-4" onPress={onAction}>
              <Text className="text-caption font-semibold">{action}</Text>
            </Button>
          ) : null}
        </View>
        <View className="items-end gap-2">
          <StatusBadge
            label={delta}
            icon={TREND_ICON[direction]}
            iconClassName={cn('size-3', TREND_TONE[direction])}
            className="self-end"
            textClassName="text-foreground font-semibold tabular-nums"
          />
          <MosaicChart levels={levels} />
        </View>
      </View>
    </Panel>
  );
}
