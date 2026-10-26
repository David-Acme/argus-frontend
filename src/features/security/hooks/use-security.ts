import { useState } from 'react';
import type { GuardMode } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import type { PresenceCue } from '@/shared/ui/presence';
import { useEpisodes } from '@/features/security/hooks/use-episodes';
import { useExpectedGuests } from '@/features/security/hooks/use-expected-guests';
import { useGuardEnvironments } from '@/features/security/hooks/use-guard';
import { useGuardMode } from '@/features/security/hooks/use-guard-mode';
import { scopeMode } from '@/features/security/model/mode-change';
import { placeScope, type PlacePick } from '@/features/security/model/places';
import { securityStatus } from '@/features/security/model/security-status';

const MINUTE_MS = 60_000;

export function useSecurity() {
  const { guard: access } = useCapabilities();
  const environments = useGuardEnvironments(access.view);
  const [pick, setPick] = useState<PlacePick | null>(null);
  const [cue, setCue] = useState<PresenceCue | undefined>(undefined);
  const scope = placeScope(environments.data ?? [], pick);
  const episodes = useEpisodes(scope.place?.id, access.view);
  const guests = useExpectedGuests(access.view);
  const mode = useGuardMode(environments);
  const now = useNow(MINUTE_MS);
  const status = securityStatus({
    environments: scope.environments,
    episodes: episodes.rows,
    guests: guests.list,
    canReview: access.review,
    now,
  });

  async function changeMode(next: GuardMode) {
    if (await mode.setMode(next, scope.place ?? undefined))
      setCue((current) => ({ name: 'modechange', id: (current?.id ?? 0) + 1 }));
  }

  return {
    access,
    scope,
    pick: setPick,
    status,
    cue,
    selectedMode: mode.pendingMode?.mode ?? scopeMode(scope.environments),
    changeMode: access.setMode ? changeMode : undefined,
    episodes,
    guests,
    environments: environments.data ?? [],
    failed: environments.status === 'failed' && environments.data == null,
    reload: environments.reload,
    now,
  };
}
