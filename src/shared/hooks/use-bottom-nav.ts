import { useFocusEffect } from 'expo-router';
import { useCallback, useId } from 'react';
import { useNavigationStore } from '@/core/stores';
import type { BottomNavContext } from '@/core/types';

/**
 * Claims the global bottom bar for the focused screen and hands it back on
 * blur. Ownership is keyed per mount, so the bar survives a route change
 * without unmounting — it never flashes between two screens that both want it.
 * Pass `null` from a screen that shows no bar; that also claims ownership, so
 * the previous screen's bar is dismissed rather than left behind.
 */
export function useBottomNav(context: BottomNavContext | null): void {
  const id = useId();
  const claim = useNavigationStore((state) => state.claim);
  const release = useNavigationStore((state) => state.release);
  const composeLabel = context?.composeLabel;
  const onCompose = context?.onCompose;

  useFocusEffect(
    useCallback(() => {
      claim(id, composeLabel != null && onCompose != null ? { composeLabel, onCompose } : null);
      return () => release(id);
    }, [claim, release, id, composeLabel, onCompose])
  );
}
