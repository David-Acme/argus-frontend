import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { usePresenceOverview } from '@/features/people';
import { homePeopleOf } from '@/features/home/model/home-people';

export function useHomePeople() {
  const { has } = useCapabilities();
  const readable = has(CAPABILITY.presenceRead);
  const selfId = String(useAuthStore((state) => state.user?.id ?? ''));
  const directory = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const { data, status, reload } = usePresenceOverview(readable);
  return {
    readable,
    status,
    retry: reload,
    people: data ? homePeopleOf(directory, data, selfId) : [],
  };
}
