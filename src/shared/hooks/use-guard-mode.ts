import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { guardService } from '@/core/services/guard.service';
import type { GuardModeState } from '@/core/types';

export function useGuardMode(enabled: boolean): GuardModeState | null {
  const [state, setState] = useState<GuardModeState | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let active = true;
      void guardService.mode().then((result) => {
        if (active && result.ok) setState(result.info);
      });
      return () => {
        active = false;
      };
    }, [enabled])
  );

  return enabled ? state : null;
}
