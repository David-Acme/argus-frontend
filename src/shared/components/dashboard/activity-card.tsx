import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { itemIn } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';
import { MosaicChart } from './mosaic-chart';

type ActivityCardProps = {
  title: string;
  /** Headline delta rendered over the mosaic, e.g. "+3.45%". */
  delta: string;
  /** Where the delta points; decides the icon and its tone. */
  direction?: 'up' | 'down' | 'flat';
  /** Real density per cell (0..3); without it the mosaic draws its own shape. */
  levels?: readonly (readonly number[])[];
  action: string;
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
}: ActivityCardProps) {
  return (
    <Animated.View
      entering={itemIn.duration(360)}
      className="bg-card overflow-hidden rounded-[26px] p-4 shadow-md shadow-black/[0.07]">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-3">
          <Text className="text-[17px] font-semibold leading-[22px]">{title}</Text>
          <Button size="sm" className="self-start rounded-full px-4" onPress={onAction}>
            <Text className="text-[13px] font-semibold">{action}</Text>
          </Button>
        </View>
        <View className="relative">
          <MosaicChart levels={levels} />
          {/* The delta sits ON the block: the number is the headline, the
              mosaic is the evidence behind it. */}
          <View className="absolute -top-1 left-0 right-0 items-center">
            <View className="bg-card flex-row items-center gap-1 rounded-full px-2.5 py-1.5 shadow-sm shadow-black/10">
              <Icon name={TREND_ICON[direction]} className={cn('size-3', TREND_TONE[direction])} />
              <Text className="text-foreground text-[11px] font-semibold">{delta}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
