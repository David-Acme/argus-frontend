import { useEffect, useMemo } from 'react';
import type { ICameraCacheRow, IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import type { GuardCameraContext, ProximityPerson, ResourceMatch } from '@/core/types';
import { proximityService } from '@/features/proximity/services/proximity.service';
import { peopleRooms, type PersonRoom } from '@/features/proximity/model/proximity-people';
import { useGuardEnvironments } from '@/features/security';
import { CAPABILITY, MODULE_IDS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';

const PEOPLE_REFRESH_MS = 15_000;

const CAMERA_PLACEMENT: readonly ResourceMatch[] = [
  { domain: 'guard', scope: 'environments' },
  { domain: 'camera', scope: 'overview' },
];

const loadPeople = () => proximityService.people();
const loadContexts = () => guardService.cameras();

export function useProximityPeopleAllowed(): boolean {
  const { has, moduleActive } = useCapabilities();
  return has(CAPABILITY.proximityManage) && moduleActive(MODULE_IDS.surveillance);
}

export function useProximityPeople() {
  const { t } = useTranslation();
  const allowed = useProximityPeopleAllowed();
  const people = useRemoteResource<ProximityPerson[]>({
    cacheKey: VIEW_CACHE_KEYS.proximityPeople,
    load: loadPeople,
    enabled: allowed,
  });
  const contexts = useRemoteResource<GuardCameraContext[]>({
    cacheKey: VIEW_CACHE_KEYS.guardCameras,
    load: loadContexts,
    enabled: allowed,
    resources: CAMERA_PLACEMENT,
  });
  const environments = useGuardEnvironments(allowed).data;
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const directory = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const reload = people.reload;

  const rows = useMemo<PersonRoom[]>(
    () =>
      peopleRooms({
        people: people.data ?? [],
        names: directory,
        world: { environments: environments ?? [], contexts: contexts.data ?? [], cameras },
        unnamed: () => t('screens.proximity.people.unnamed'),
      }),
    [cameras, contexts.data, directory, environments, people.data, t]
  );

  useEffect(() => {
    if (!allowed) return undefined;
    const timer = setInterval(() => void reload(), PEOPLE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [allowed, reload]);

  return {
    allowed,
    rows,
    loaded: people.data !== null,
    failed: people.status === 'failed',
    reload,
  };
}
