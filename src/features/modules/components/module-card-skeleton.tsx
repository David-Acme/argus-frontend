import { View } from 'react-native';

export function ModuleCardSkeleton() {
  return (
    <View className="bg-card gap-4 rounded-3xl p-4 shadow-md shadow-black/[0.05]" accessibilityElementsHidden>
      <View className="flex-row items-center gap-3">
        <View className="bg-surface-secondary size-12 rounded-2xl" />
        <View className="flex-1 gap-2">
          <View className="bg-surface-secondary h-4 w-2/5 rounded-md" />
          <View className="bg-surface-secondary h-3 w-4/5 rounded-md" />
        </View>
      </View>
      <View className="bg-surface-secondary h-3 w-1/3 rounded-md" />
    </View>
  );
}
