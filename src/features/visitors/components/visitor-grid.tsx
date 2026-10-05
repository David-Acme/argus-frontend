import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { VisitorSummary } from '@/core/types';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { VisitorCard } from '@/features/visitors/components/visitor-card';

type VisitorGridProps = {
  id: string;
  visitors: readonly VisitorSummary[];
  selectedIds?: readonly number[];
  selectable?: boolean;
  oneRow?: boolean;
  onPress: (visitor: VisitorSummary) => void;
};

const TILE_MIN_WIDTH = 150;
const GAP = 12;

const fitting = (width: number) => Math.max(2, Math.min(6, Math.floor((width + GAP) / (TILE_MIN_WIDTH + GAP))));

export function VisitorGrid({
  id,
  visitors,
  selectedIds = [],
  selectable = false,
  oneRow = false,
  onPress,
}: VisitorGridProps) {
  const [width, setWidth] = useState(0);
  const shown = oneRow && width > 0 ? visitors.slice(0, fitting(width)) : visitors;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={oneRow ? onLayout : undefined}>
      <ResponsiveGrid
        id={id}
        items={shown}
        keyOf={(visitor) => String(visitor.id)}
        columnsFor={fitting}
        gap={GAP}
        renderItem={(visitor) => (
          <VisitorCard
            visitor={visitor}
            selectable={selectable}
            selected={selectedIds.includes(visitor.id)}
            onPress={onPress}
          />
        )}
      />
    </View>
  );
}
