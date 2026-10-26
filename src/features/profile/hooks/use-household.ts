import type { DashboardSummary } from '@/core/types';
import type { IInvitationRecord, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import {
  CAPABILITY,
  EMPTY_DASHBOARD_SUMMARY,
  MODULE_IDS,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useHomePeople } from '@/features/home';
import type { HomePerson } from '@/features/home';
import {
  activeNames,
  householdSummary,
  pendingInvitations,
} from '@/features/profile/model/household';
import type { HouseholdSummary } from '@/features/profile/model/household';
import { homeSteps } from '@/features/profile/model/home-steps';
import type { HomeSteps } from '@/features/profile/model/home-steps';

export type Household = {
  people: readonly HomePerson[];
  summary: HouseholdSummary | null;
  names: readonly string[];
  invitations: number;
  steps: HomeSteps;
  invites: boolean;
};

const MINUTE_MS = 60_000;

export function useHousehold(): Household {
  const { has, moduleActive, roleActive } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const home = useHomePeople();
  const directory = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const invitationRows = useViewCacheRows<IInvitationRecord>(VIEW_CACHE_KEYS.peopleInvitations);
  const summary =
    useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary) ??
    EMPTY_DASHBOARD_SUMMARY;
  const names = activeNames(directory);
  const invites = roleActive && has(CAPABILITY.invitationsManage);
  const known = home.people.some((person) => person.state !== 'unknown');
  return {
    people: home.people,
    summary: home.readable && known ? householdSummary(home.people) : null,
    names,
    invitations: invites ? pendingInvitations(invitationRows, Math.floor(now / 1000)) : 0,
    invites,
    steps: homeSteps({
      invite: { applies: invites, done: names.length > 1 },
      camera: {
        applies:
          roleActive && moduleActive(MODULE_IDS.surveillance) && has(CAPABILITY.cameraManage),
        done: summary.camerasTotal > 0,
      },
    }),
  };
}
