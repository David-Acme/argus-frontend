import { View } from 'react-native';
import { Text } from '@/shared/ui/text';

export type DaySeparatorProps = { label: string; floating?: boolean };

export function DaySeparator({ label, floating = false }: DaySeparatorProps) {
  return (
    <View pointerEvents="none" className={floating ? 'items-center' : 'items-center pt-4 pb-1'}>
      <View className="bg-surface border-line rounded-full border px-3 py-1">
        <Text variant="caption" tone="2" heading={floating ? undefined : 3}>
          {label}
        </Text>
      </View>
    </View>
  );
}
