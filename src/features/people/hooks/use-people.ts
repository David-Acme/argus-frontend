import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useAccessView, useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useOptimisticRows } from '@/shared/hooks/use-optimistic-rows';
import { peopleAccessOf } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import { PEOPLE_HREF } from '@/features/people/constants/people.constant';
import { usePresenceOverview } from '@/features/people/hooks/use-presence';
import { personLinesOf } from '@/features/people/model/people';
import { USER_LENSES } from '@/features/people/model/people-optimistic';

const MINUTE_MS = 60_000;

export function usePeople() {
  const { has } = useCapabilities();
  const view = useAccessView();
  const access = peopleAccessOf(view);
  const selfId = String(useAuthStore((state) => state.user?.id ?? ''));
  const now = useNow(MINUTE_MS);
  const cached = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const synced = useViewCacheValue<boolean>(VIEW_CACHE_KEYS.syncReady) === true;
  const { rows } = useOptimisticRows(cached, USER_LENSES);
  const presence = usePresenceOverview(has(CAPABILITY.presenceRead));
  const overview = presence.data ?? null;
  const lines = personLinesOf({ rows, selfId, overview, now: new Date(now) });
  return {
    lines,
    rows,
    synced,
    action: access.profileAction,
    invites: access.receivesInvitations,
    visitors: routeFallback(PEOPLE_HREF.visitors, view) === null,
    refreshPresence: presence.reload,
  };
}

export type People = ReturnType<typeof usePeople>;
