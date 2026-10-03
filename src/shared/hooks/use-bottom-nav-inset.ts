import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_GAP, BOTTOM_NAV_HEIGHT } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';

const RAIL_INSET = 24;
const BAR_GAP = 12;

export function useBottomNavInset(): number {
  const insets = useSafeAreaInsets();
  const { usesNavRail } = useWindowClass();
  return usesNavRail
    ? RAIL_INSET
    : insets.bottom + BOTTOM_NAV_GAP + BOTTOM_NAV_HEIGHT + BAR_GAP;
}
