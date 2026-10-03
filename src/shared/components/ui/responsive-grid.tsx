import { useState, type ReactNode } from 'react';
import { useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';

type ResponsiveGridProps<T> = {
  id: string;
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  columnsFor: (width: number, count: number) => number;
  gap: number;
  trailing?: (width: number) => ReactNode;
};

const measured = new Map<string, number>();

export function ResponsiveGrid<T>({ id, items, keyOf, renderItem, columnsFor, gap, trailing }: ResponsiveGridProps<T>) {
  const viewport = useWindowDimensions();
  const [width, setWidth] = useState(() => measured.get(id) ?? viewport.width);
  const columns = Math.max(1, columnsFor(width, items.length));
  const tileWidth = (width - gap * (columns - 1)) / columns;
  const freeSlots = (columns - (items.length % columns)) % columns;
  const trailingWidth = trailing && freeSlots > 0 ? tileWidth * freeSlots + gap * (freeSlots - 1) : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    measured.set(id, next);
    setWidth(next);
  };

  return (
    <View className="flex-row flex-wrap" style={{ gap }} onLayout={onLayout}>
      {items.map((item) => (
        <View key={keyOf(item)} style={{ width: tileWidth }}>
          {renderItem(item)}
        </View>
      ))}
      {trailing && trailingWidth > 0 ? trailing(trailingWidth) : null}
    </View>
  );
}
