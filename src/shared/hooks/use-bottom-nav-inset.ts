import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_GAP, BOTTOM_NAV_HEIGHT } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';

const RAIL_INSET = 24;
const BAR_GAP = 12;

/**
 * Bottom padding a list needs to clear the floating bar. Lists that scroll on
 * their own sit inside the shell's scroller, so the shell's own padding never
 * reaches their content.
 */
export function useBottomNavInset(): number {
  const insets = useSafeAreaInsets();
  const { usesNavRail } = useWindowClass();
  return usesNavRail
    ? RAIL_INSET
    : insets.bottom + BOTTOM_NAV_GAP + BOTTOM_NAV_HEIGHT + BAR_GAP;
}
