import { createContext, useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inset, layout, size } from '@/shared/theme';

export const BottomNavShown = createContext(false);

export function useBottomNavInset(): number {
  const shown = useContext(BottomNavShown);
  const insets = useSafeAreaInsets();
  if (!shown) return layout.gutterMedium;
  return Math.max(insets.bottom, inset.nav.barBottom) + size.tabBar + layout.gutterCompact;
}
