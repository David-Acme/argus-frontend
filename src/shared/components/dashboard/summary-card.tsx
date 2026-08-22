import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { itemIn } from '@/shared/libs/animations';

type SummaryItem = {
  icon: IconName;
  label: string;
  value: string;
};

type SummaryCardProps = {
  title: string;
  items: readonly SummaryItem[];
};

/**
 * The numbers behind the screen, for windows wide enough to keep them in view.
 * A compact card instead of tiles: the side column is narrow, and four short
 * rows read faster there than four boxes.
 */
export function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <Animated.View
      entering={itemIn.delay(240).duration(320)}
      className="bg-card gap-3 rounded-[22px] p-4 shadow-md shadow-black/[0.06]">
      <Text className="text-[15px] font-semibold">{title}</Text>
      <View className="gap-2.5">
        {items.map((item) => (
          <View key={item.label} className="flex-row items-center gap-3">
            <View className="bg-surface-secondary size-8 items-center justify-center rounded-xl">
              <Icon name={item.icon} className="text-foreground-secondary size-4" />
            </View>
            <Text className="text-foreground-secondary flex-1 text-[13px]" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="text-[15px] font-semibold">{item.value}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
