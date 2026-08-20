import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { itemIn } from '@/shared/libs/animations';
import { MosaicChart } from './mosaic-chart';

type ActivityCardProps = {
  title: string;
  /** Headline delta rendered over the mosaic, e.g. "+3.45%". */
  delta: string;
  action: string;
  onAction?: () => void;
};

export function ActivityCard({ title, delta, action, onAction }: ActivityCardProps) {
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
          <MosaicChart />
          {/* The delta sits ON the block: the number is the headline, the
              mosaic is the evidence behind it. */}
          <View className="absolute -top-1 left-0 right-0 items-center">
            <View className="bg-card flex-row items-center gap-1 rounded-full px-2.5 py-1.5 shadow-sm shadow-black/10">
              <Icon name="trending-up" className="text-success size-3" />
              <Text className="text-foreground text-[11px] font-semibold">{delta}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
