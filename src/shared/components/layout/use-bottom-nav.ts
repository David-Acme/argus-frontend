import { useFocusEffect } from 'expo-router';
import { useCallback, useId } from 'react';
import { useNavigationStore } from '@/core/stores';

export function useBottomNav(wanted: boolean): void {
  const id = useId();
  const claim = useNavigationStore((state) => state.claim);
  const release = useNavigationStore((state) => state.release);

  useFocusEffect(
    useCallback(() => {
      claim(id, wanted);
      return () => release(id);
    }, [claim, release, id, wanted]),
  );
}
