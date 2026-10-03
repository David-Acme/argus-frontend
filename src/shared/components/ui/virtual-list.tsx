import { LegendList } from '@legendapp/list/react-native';
import type { ReactElement } from 'react';

type VirtualListProps<T> = {
  data: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  estimatedItemSize: number;
  paddingBottom?: number;
};

export function VirtualList<T>({ data, keyOf, renderItem, estimatedItemSize, paddingBottom = 0 }: VirtualListProps<T>) {
  return (
    <LegendList
      data={data as T[]}
      keyExtractor={keyOf}
      renderItem={({ item }) => renderItem(item)}
      estimatedItemSize={estimatedItemSize}
      contentContainerStyle={{ paddingBottom }}
      recycleItems
      showsVerticalScrollIndicator={false}
    />
  );
}
