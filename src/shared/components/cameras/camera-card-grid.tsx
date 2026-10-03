import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { CameraCard } from './camera-card';
import { CreateTile } from '@/shared/components/ui/create-tile';

type CameraCardGridProps = {
  items: readonly ICameraCacheRow[];
  onSelect: (id: string) => void;
  createLabel: string;
  createHint: string;
  onCreate?: () => void;
};

const GAP = 16;

export function cameraColumnsFor(width: number): number {
  if (width >= 1180) return 4;
  if (width >= 840) return 3;
  if (width >= 520) return 2;
  return 1;
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
        <CreateTile label={createLabel} hint={createHint} style={{ width: createWidth }} onPress={onCreate} />
      ) : null}
    </View>
  );
}
