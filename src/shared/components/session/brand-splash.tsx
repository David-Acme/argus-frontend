import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

export function BrandSplash() {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-5 px-8" accessibilityLabel="Argus">
      <View className="bg-interactive size-24 items-center justify-center rounded-[28px] shadow-lg shadow-black/10">
        <View className="border-foreground-on-interactive size-12 items-center justify-center rounded-full border-[3px]">
          <View className="bg-foreground-on-interactive absolute left-2.5 size-1.5 rounded-full" />
          <View className="bg-foreground-on-interactive absolute right-2.5 size-1.5 rounded-full" />
        </View>
      </View>
      <Text variant="title">Argus</Text>
      <ActivityIndicator accessibilityLabel="Loading" />
    </View>
  );
}
