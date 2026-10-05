import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { VisitorSummary } from '@/core/types';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { VisitorCard } from '@/features/visitors/components/visitor-card';
import { VISITOR_TILE_GAP, visitorColumns } from '@/features/visitors/model/visitor';

type VisitorGridProps = {
  id: string;
  visitors: readonly VisitorSummary[];
  onPress: (visitor: VisitorSummary) => void;
};

export function VisitorGrid({ id, visitors, onPress }: VisitorGridProps) {
  const [width, setWidth] = useState(0);
  const shown = width > 0 ? visitors.slice(0, visitorColumns(width)) : visitors;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout}>
      <ResponsiveGrid
        id={id}
        items={shown}
        keyOf={(visitor) => String(visitor.id)}
        columnsFor={visitorColumns}
        gap={VISITOR_TILE_GAP}
        renderItem={(visitor) => <VisitorCard visitor={visitor} onPress={onPress} />}
      />
    </View>
  );
}
