import { View } from 'react-native';
import { Text } from '@/shared/ui/text';

export type DaySeparatorProps = { label: string };

export function DaySeparator({ label }: DaySeparatorProps) {
  return (
    <View className="items-center pt-4 pb-1">
      <Text variant="caption" tone="3" heading={3}>
        {label}
      </Text>
    </View>
  );
}
