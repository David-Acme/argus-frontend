import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { CameraCard } from './camera-card';

type CameraCardGridProps = {
  items: readonly ICameraCacheRow[];
  onSelect: (id: string) => void;
  createLabel: string;
  createHint: string;
  onCreate?: () => void;
};

type CameraCreateTileProps = {
  label: string;
  hint: string;
  width: number;
  onPress: () => void;
};

const GAP = 16;

export function cameraColumnsFor(width: number): number {
  if (width >= 1180) return 4;
  if (width >= 840) return 3;
  if (width >= 520) return 2;
  return 1;
}

function CameraCreateTile({ label, hint, width, onPress }: CameraCreateTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width }}
      className="border-border items-center justify-center gap-3 rounded-3xl border-2 border-dashed px-6 py-8 active:opacity-70 web:hover:bg-card">
      <View className="bg-surface-secondary size-12 items-center justify-center rounded-full">
        <Icon name="plus" className="text-foreground-secondary size-5" />
      </View>
      <View className="items-center gap-1">
        <Text variant="subhead" className="text-foreground-secondary text-center">
          {label}
        </Text>
        <Text variant="caption" className="text-center" numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </Pressable>
  );
}

export function CameraCardGrid({
  items,
  onSelect,
  createLabel,
  createHint,
  onCreate,
}: CameraCardGridProps) {
  const [width, setWidth] = useState(0);
  const columns = Math.min(cameraColumnsFor(width), Math.max(1, items.length + (onCreate ? 1 : 0)), Math.max(2, items.length));
  const tileWidth = width > 0 ? (width - GAP * (columns - 1)) / columns : 0;
  const freeSlots = (columns - (items.length % columns)) % columns;
  const createWidth = freeSlots > 0 ? tileWidth * freeSlots + GAP * (freeSlots - 1) : 0;

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: GAP }}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0
        ? items.map((item) => (
            <View key={item.id} style={{ width: tileWidth }}>
              <CameraCard item={item} onPress={onSelect} />
            </View>
          ))
        : null}
      {onCreate && createWidth > 0 ? (
        <CameraCreateTile label={createLabel} hint={createHint} width={createWidth} onPress={onCreate} />
      ) : null}
    </View>
  );
}
