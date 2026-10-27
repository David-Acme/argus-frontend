import type { ResourceMatch } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { presenceService } from '@/features/people/services/presence.service';

const loadPresence = () => presenceService.overview();

const PRESENCE_RESOURCES: readonly ResourceMatch[] = [{ domain: 'guard', scope: 'presence' }];

export function usePresenceOverview(enabled: boolean) {
  return useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.presence,
    load: loadPresence,
    enabled,
    resources: PRESENCE_RESOURCES,
  });
}
