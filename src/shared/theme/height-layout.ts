import { useWindowDimensions } from 'react-native';
import { inset, layout, size, space, typeRoles } from './tokens';
import { classifyWindowSize, type WindowLayout, type WindowSize } from './window-layout';

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

export type NavBarLayout = {
  bar: number;
  tab: number;
  gap: number;
  labelled: boolean;
  icon: 'default' | 'small';
  presence: number;
};

export type NavOffsets = { footprint: number; clearance: number; cap: number; toast: number };

const REGULAR_FOOTPRINT = size.tabBar + inset.nav.barBottom;

export function navBarOf(layoutOfHeight: HeightLayout, fontScale: number): NavBarLayout {
  const { heightClass, landscape } = layoutOfHeight;
  const labelled = fontScale <= typeRoles.tab.maxScale && heightClass !== 'tiny' && !landscape;
  if (heightClass === 'regular' && !landscape)
    return {
      bar: size.tabBar,
      tab: size.tab,
      gap: inset.nav.barBottom,
      labelled,
      icon: 'default',
      presence: size.presenceTab,
    };
  return {
    bar: size.tabBarShort,
    tab: size.tabShort,
    gap: inset.nav.barBottomShort,
    labelled,
    icon: labelled ? 'small' : 'default',
    presence: labelled ? size.iconSmall : size.presenceTabShort,
  };
}

export function navOffsetsOf({ bar, gap }: NavBarLayout, bottomInset: number): NavOffsets {
  const footprint = Math.max(bottomInset, gap) + bar;
  return {
    footprint,
    clearance: footprint + inset.screen.bodyBottom - REGULAR_FOOTPRINT,
    cap: footprint + inset.nav.capBottom - REGULAR_FOOTPRINT,
    toast: footprint + inset.toast.offset - REGULAR_FOOTPRINT,
  };
}

export function useNavBarLayout(): NavBarLayout {
  const { width, height, fontScale } = useWindowDimensions();
  return navBarOf(heightLayoutOf({ width, height }), fontScale);
}

export function paneSplitOf({ windowClass }: WindowLayout, { landscape }: HeightLayout): boolean {
  return windowClass !== 'compact' && !landscape;
}

export function usePaneSplit(): boolean {
  const { width, height } = useWindowDimensions();
  return paneSplitOf(classifyWindowSize({ width, height }), heightLayoutOf({ width, height }));
}

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

export type SheetChromeRoom = SheetRoom & { footer: number };

export type SheetChrome = { footerPinned: boolean; header: boolean };

const SHEET_FOCUS_ROOM = size.field + space[8];

export function sheetChromeOf(room: SheetChromeRoom): SheetChrome {
  const free = sheetCeilingOf(room) - room.keyboard;
  const footerPinned = free >= room.header + room.footer + SHEET_FOCUS_ROOM;
  return { footerPinned, header: footerPinned || free >= room.header + SHEET_FOCUS_ROOM };
}

export function useHeightLayout(): HeightLayout {
  const { width, height } = useWindowDimensions();
  return heightLayoutOf({ width, height });
}
