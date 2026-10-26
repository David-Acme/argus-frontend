import type { DashboardSummary } from '@/core/types';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { CAPABILITY, EMPTY_DASHBOARD_SUMMARY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { peopleAccessOf } from '@/shared/libs/capabilities';
import { roleLabelOf } from '@/shared/libs/role-label';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useHomePeople } from '@/features/home';
import type { HomePerson } from '@/features/home';
import { CONNECTS_DEVICE, useSessions } from '@/features/sessions';
import { activeNames } from '@/features/profile/model/household';
import { deviceKindOf, factsOf, initialsOf } from '@/features/profile/model/profile-hero';
import type { DeviceKind, ProfileFact } from '@/features/profile/model/profile-hero';

export type ProfileActions = { edit: boolean; invite: boolean; qr: boolean };

export type ProfileHero = {
  name: string;
  initials: string;
  role: string;
  self: HomePerson | null;
  device: DeviceKind | null;
  facts: readonly ProfileFact[];
  actions: ProfileActions;
};

export function useProfileHero(): ProfileHero {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const view = useCapabilities();
  const people = peopleAccessOf(view);
  const directory = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const summary =
    useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary) ??
    EMPTY_DASHBOARD_SUMMARY;
  const household = useHomePeople();
  const sessions = useSessions();
  const current = sessions.overview.current;
  const deviceCount = sessions.answered
    ? (current ? 1 : 0) + sessions.overview.others.length
    : null;
  const manages = people.profileAction === 'manage';
  const name = user?.name ?? '';
  return {
    name,
    initials: initialsOf(name),
    role: t('screens.profile.role-home', { role: roleLabelOf(user?.role ?? '', t) }),
    self: household.people.find((person) => person.self && person.state !== 'unknown') ?? null,
    device: deviceKindOf(current?.platform ?? null),
    facts: factsOf({
      people: people.profileAction
        ? { count: activeNames(directory).length, href: manages ? '/users' : '/people' }
        : null,
      cameras: view.has(CAPABILITY.cameraView) ? summary.camerasTotal : null,
      devices: deviceCount,
    }),
    actions: {
      edit: manages,
      invite: view.has(CAPABILITY.invitationsManage) && view.roleActive,
      qr: CONNECTS_DEVICE,
    },
  };
}
