import { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { ZONE_COLORS } from '@/features/cameras/constants';

type ZoneRowProps = {
  id: string;
  name: string;
  typeLabel: string;
  pointsLabel: string;
  color: string;
  onPress?: (id: string) => void;
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
      disabled={!onPress}
      onPress={() => onPress?.(id)}
      className="bg-surface-secondary/60 web:hover:bg-surface-secondary flex-row items-center gap-3 rounded-2xl p-3 active:opacity-80">
      <View className="size-3 rounded-full" style={{ backgroundColor: color || ZONE_COLORS[0] }} />
      <View className="min-w-0 flex-1">
        <Text variant="label" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="caption" className="text-foreground-secondary">
          {typeLabel} · {pointsLabel}
        </Text>
      </View>
      {onPress ? <Icon name="square-pen" className="text-muted-foreground size-4" /> : null}
    </Pressable>
  );
});
