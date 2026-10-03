import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

type TaskStatusGroupProps = {
  label: string;
  count: number;
  children: ReactNode;
};

export function TaskStatusGroup({ label, count, children }: TaskStatusGroupProps) {
  if (count === 0) return null;

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2 px-1 pb-1">
        <Text className="text-foreground-secondary text-[12px] font-semibold uppercase tracking-wide">
          {label}
        </Text>
        <Text className="text-muted-foreground text-[12px]">{count}</Text>
      </View>
      <View className="bg-card divide-border-subtle rounded-[18px] px-3 shadow-md shadow-black/[0.05]">
        {children}
      </View>
    </View>
  );
}
