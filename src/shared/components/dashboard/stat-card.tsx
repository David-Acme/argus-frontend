import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';

type StatCardProps = {
  icon: IconName;
  value: string;
  label: string;
  detail: string;
  onPress?: () => void;
};

export function StatCard({ icon, value, label, detail, onPress }: StatCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      className="bg-card min-h-[132px] flex-1 rounded-[24px] p-4 shadow-md shadow-black/[0.06] active:opacity-80"
      onPress={onPress}>
      <View className="bg-surface-secondary mb-4 size-9 items-center justify-center rounded-full">
        <Icon name={icon} className="text-foreground-secondary size-4" />
      </View>
      <Text className="text-2xl font-semibold tracking-tight">{value}</Text>
      <View className="mt-1 flex-row items-center justify-between gap-2">
        <Text className="text-foreground-secondary text-xs font-medium">{label}</Text>
        <Text className="text-muted-foreground text-[10px]">{detail}</Text>
      </View>
    </Pressable>
  );
}
