import { useEffect, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/core/stores';
import type { ArgusResult } from '@/features/voice/model/argus-result';
import { argusResults } from '@/features/voice/services/results';

const subscribe = (listener: () => void): (() => void) => argusResults.subscribe(listener);

const snapshot = (): readonly ArgusResult[] => argusResults.snapshot;

export function useArgusResults(): readonly ArgusResult[] {
  const userId = useAuthStore((state) => (state.user ? String(state.user.id) : null));
  const results = useSyncExternalStore(subscribe, snapshot, snapshot);

  useEffect(() => {
    argusResults.bindUser(userId);
  }, [userId]);

  return results;
}
