import {
  BOTTOM_NAV_FAB_COMPACT,
  BOTTOM_NAV_FAB_SIZE,
  BOTTOM_NAV_MAX_WIDTH,
  BOTTOM_NAV_PADDING,
  BOTTOM_NAV_ROW_GAP,
  BOTTOM_NAV_SIDE_MARGIN,
  BOTTOM_NAV_TAB_MIN,
  BOTTOM_NAV_TAB_SIZE,
} from '@/shared/constants';

export type BottomNavMetrics = {
  row: number;
  fab: number;
  tab: number;
  pill: number;
};

type BottomNavInput = {
  width: number;
  tabCount: number;
};

const pillWidth = (tabCount: number, tab: number): number => tabCount * tab + 2 * BOTTOM_NAV_PADDING;

export function bottomNavMetrics({ width, tabCount }: BottomNavInput): BottomNavMetrics {
  const row = Math.max(0, Math.min(width - 2 * BOTTOM_NAV_SIDE_MARGIN, BOTTOM_NAV_MAX_WIDTH));
  const count = Math.max(1, tabCount);
  const roomy = pillWidth(count, BOTTOM_NAV_TAB_SIZE) + BOTTOM_NAV_ROW_GAP + BOTTOM_NAV_FAB_SIZE <= row;
  const fab = roomy ? BOTTOM_NAV_FAB_SIZE : BOTTOM_NAV_FAB_COMPACT;
  const room = row - BOTTOM_NAV_ROW_GAP - fab - 2 * BOTTOM_NAV_PADDING;
  const tab = Math.max(BOTTOM_NAV_TAB_MIN, Math.min(BOTTOM_NAV_TAB_SIZE, Math.floor(room / count)));
  return { row, fab, tab, pill: pillWidth(count, tab) };
}
