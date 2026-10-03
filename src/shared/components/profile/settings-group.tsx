import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Panel } from '@/shared/components/ui/panel';
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
      <Panel className="gap-1 p-1.5">{children}</Panel>
    </View>
  );
}
