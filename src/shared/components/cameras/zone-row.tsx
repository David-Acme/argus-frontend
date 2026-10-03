import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { ZONE_COLORS } from '@/shared/constants';

type ZoneRowProps = {
  id: string;
  name: string;
  typeLabel: string;
  pointsLabel: string;
  color: string;
  onPress: (id: string) => void;
};

export const ZoneRow = memo(function ZoneRow({
  id,
  name,
  typeLabel,
  pointsLabel,
  color,
  onPress,
}: ZoneRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={() => onPress(id)}
      className="bg-card flex-row items-center gap-3 rounded-xl p-3 active:opacity-80">
      <View className="size-3 rounded-full" style={{ backgroundColor: color || ZONE_COLORS[0] }} />
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-medium" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-foreground-secondary text-xs">
          {typeLabel} · {pointsLabel}
        </Text>
      </View>
      <Icon name="square-pen" className="text-muted-foreground size-4" />
    </Pressable>
  );
});
