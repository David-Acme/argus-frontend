import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

type DaySeparatorProps = {
  label: string;
};

export function DaySeparator({ label }: DaySeparatorProps) {
  return (
    <View className="items-center pt-5 pb-1">
      <View className="bg-surface-secondary rounded-full px-3 py-1">
        <Text accessibilityRole="header" variant="micro" className="text-foreground-secondary">
          {label}
        </Text>
      </View>
    </View>
  );
}
