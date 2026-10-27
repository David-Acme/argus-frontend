import { useWindowDimensions } from 'react-native';
import { inset, layout, size, space } from './tokens';
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
  return landscape ? 'short' : heightClass;
}

export function talkSizeOf({ heightClass, landscape }: HeightLayout): number {
  return heightClass === 'regular' && !landscape ? size.talk : size.talkShort;
}

export type SheetShape = { long: boolean; form: boolean };

export function sheetDetentsOf(
  { long, form }: SheetShape,
  layoutOfHeight: HeightLayout
): readonly SheetDetent[] {
  const roomy = layoutOfHeight.heightClass === 'regular' && !layoutOfHeight.landscape;
  if (!long && (roomy || !form)) return ['auto'];
  return roomy ? [0.6, 1] : [1];
}

export const sheetScrolls = (detents: readonly SheetDetent[]): boolean => detents[0] !== 'auto';

export function paletteTopOf({ heightClass, landscape }: HeightLayout): number {
  return heightClass === 'regular' && !landscape ? inset.palette.top : layout.gutterCompact;
}

export type SheetRoom = { height: number; top: number; header: number; keyboard: number };

export function sheetCeilingOf({ height, top }: Pick<SheetRoom, 'height' | 'top'>): number {
  return height - top - space[4];
}

export function sheetBodyCapOf(room: SheetRoom): number {
  return Math.max(0, sheetCeilingOf(room) - room.header - room.keyboard);
}

export function useHeightLayout(): HeightLayout {
  const { width, height } = useWindowDimensions();
  return heightLayoutOf({ width, height });
}
