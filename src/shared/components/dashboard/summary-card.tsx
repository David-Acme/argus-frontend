import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { Panel } from '@/shared/components/ui/panel';

type SummaryItem = {
  icon: IconName;
  label: string;
  value: string;
};

type SummaryCardProps = {
  title: string;
  items: readonly SummaryItem[];
};

export function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <Panel title={title}>
      <View className="gap-2.5">
        {items.map((item) => (
          <View key={item.label} className="flex-row items-center gap-3">
            <View className="bg-surface-secondary size-8 items-center justify-center rounded-xl">
              <Icon name={item.icon} className="text-foreground-secondary size-4" />
            </View>
            <Text className="text-foreground-secondary flex-1 text-caption" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="text-body font-semibold">{item.value}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}
