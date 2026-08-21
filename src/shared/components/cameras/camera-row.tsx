import { memo } from 'react';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

export type CameraRowItem = {
  id: string;
  icon: IconName;
  name: string;
  ip: string;
  model: string;
  isOnline: boolean;
  isEnabled: boolean;
  zones: number;
};

type CameraRowProps = {
  item: CameraRowItem;
  statusLabel: string;
  zonesLabel: string;
  onPress: (id: string) => void;
};

export const CameraRow = memo(function CameraRow({
  item,
  statusLabel,
  zonesLabel,
  onPress,
}: CameraRowProps) {
  const dot = !item.isEnabled ? 'bg-border' : item.isOnline ? 'bg-success' : 'bg-error';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={() => onPress(item.id)}
      className="bg-card flex-row items-center gap-3 rounded-2xl p-3.5 shadow-sm shadow-black/[0.06] active:opacity-80">
      <View className="bg-surface-secondary size-10 items-center justify-center rounded-xl">
        <Icon name={item.icon} className="text-foreground-secondary size-5" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-foreground-secondary text-xs" numberOfLines={1}>
          {[item.ip, item.model].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View className="items-end gap-1">
        <View className="flex-row items-center gap-1.5">
          <View className={cn('size-2 rounded-full', dot)} />
          <Text className="text-foreground-secondary text-xs">{statusLabel}</Text>
        </View>
        <Text className="text-muted-foreground text-[11px]">{zonesLabel}</Text>
      </View>
      <Icon name="chevron-right" className="text-muted-foreground size-4" />
    </Pressable>
  );
});
