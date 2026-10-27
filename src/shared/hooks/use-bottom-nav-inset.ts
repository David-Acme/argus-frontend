import { createContext, useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { layout, navOffsetsOf, useNavBarLayout, type NavOffsets } from '@/shared/theme';

export const BottomNavShown = createContext(false);

export function useNavOffsets(): NavOffsets {
  const insets = useContext(SafeAreaInsetsContext);
  return navOffsetsOf(useNavBarLayout(), insets?.bottom ?? 0);
}

export function useBottomNavInset(): number {
  const shown = useContext(BottomNavShown);
  const { footprint } = useNavOffsets();
  if (!shown) return layout.gutterMedium;
  return footprint + layout.gutterCompact;
}
