import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { segmentsFit } from './segments-fit';

export function useFit(count: number) {
  const [width, setWidth] = useState(0);
  const [measured, setMeasured] = useState<readonly number[]>([]);
  const measure = (index: number, next: number) =>
    setMeasured((widths) => {
      if (widths[index] === next) return widths;
      const grown = [...widths];
      grown[index] = next;
      return grown;
    });
  const contentWidths = Array.from({ length: count }, (_, index) => measured[index] ?? 0);
  return {
    fits: segmentsFit({ width, contentWidths }),
    onLayout: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    measure,
  };
}
