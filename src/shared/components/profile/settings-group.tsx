import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

type SettingsGroupProps = {
  title: string;
  children: ReactNode;
};

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <View className="gap-2">
      <Text variant="label" className="text-foreground-secondary px-1">
        {title}
      </Text>
      <View className="bg-card border-border-subtle gap-1 rounded-3xl border p-1.5">{children}</View>
    </View>
  );
}
