import { useWindowDimensions } from 'react-native';
import { layout, size } from './tokens';
import type { WindowSize } from './window-layout';

export type HeightClass = 'tiny' | 'short' | 'regular';

export type HeightLayout = { heightClass: HeightClass; landscape: boolean };

export type SheetDetent = number | 'auto';

export function heightClassOf(height: number): HeightClass {
  if (height < layout.tinyHeight) return 'tiny';
  return height < layout.shortHeight ? 'short' : 'regular';
}

export function phoneLandscape({ width, height }: WindowSize): boolean {
  return height < layout.compactHeight && width > height;
}

export function heightLayoutOf(window: WindowSize): HeightLayout {
  return { heightClass: heightClassOf(window.height), landscape: phoneLandscape(window) };
}

export function stageStepOf({ heightClass, landscape }: HeightLayout): HeightClass {
  return landscape ? 'regular' : heightClass;
}

export function talkSizeOf({ heightClass, landscape }: HeightLayout): number {
  return heightClass === 'regular' && !landscape ? size.talk : size.talkShort;
}

export function sheetDetentsOf(
  long: boolean,
  layoutOfHeight: HeightLayout
): readonly SheetDetent[] {
  if (!long) return ['auto'];
  return layoutOfHeight.heightClass === 'regular' && !layoutOfHeight.landscape ? [0.6, 1] : [1];
}

export function useHeightLayout(): HeightLayout {
  const { width, height } = useWindowDimensions();
  return heightLayoutOf({ width, height });
}
