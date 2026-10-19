import { useMemo } from 'react';
import { usePrivacyDirectory } from '@/features/privacy/hooks/use-privacy-directory';
import { watchmanReadiness, type WatchmanReadiness } from '@/features/privacy/model/privacy';

type UseHouseholdWatchmanOptions = {
  enabled: boolean;
};

export function useHouseholdWatchman({ enabled }: UseHouseholdWatchmanOptions): WatchmanReadiness | null {
  const { directory } = usePrivacyDirectory({ enabled });
  return useMemo(
    () => (enabled && directory ? watchmanReadiness(directory.household, directory.users) : null),
    [directory, enabled]
  );
}
