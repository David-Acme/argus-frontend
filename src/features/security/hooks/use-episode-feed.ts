import { guardEpisodeFeed } from '@/core/services/guard.service';
import type { ResourceMatch } from '@/core/types';
import { GUARD_EPISODES_ALL_SCOPE } from '@/shared/constants';
import { useRemoteFeed } from '@/shared/hooks/use-infinite-list';

const GUARD_EPISODES: readonly ResourceMatch[] = [{ domain: 'guard', scope: 'episodes' }];

export function useEpisodeFeed(environmentId: number | undefined, enabled: boolean) {
  const scope = environmentId === undefined ? GUARD_EPISODES_ALL_SCOPE : String(environmentId);
  return useRemoteFeed(guardEpisodeFeed, scope, enabled, GUARD_EPISODES);
}
