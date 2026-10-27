import { View } from 'react-native';
import { Icon } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';

export type PrivacyLineProps = { text: string };

export function PrivacyLine({ text }: PrivacyLineProps) {
  return (
    <View className="flex-row items-center gap-2 self-center">
      <Icon name="lock" size="small" tone="accent" />
      <View className="min-w-0 shrink">
        <Text variant="meta" tone="2">
          {text}
        </Text>
      </View>
    </View>
  );
}
