import type { Href } from 'expo-router';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment, GuardExpectedGuest } from '@/core/types';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useMaintenance } from '@/features/security/hooks/use-maintenance';
import { moreKeys, moreRows, type MoreKey } from '@/features/security/model/more-rows';

export type MoreFacts = {
  guests: readonly GuardExpectedGuest[];
  environments: readonly GuardEnvironment[];
};

const MINUTE_MS = 60_000;

export const MORE_HREF: Readonly<Record<MoreKey, Href>> = {
  visits: '/security/visits',
  places: '/security/places',
  maintenance: '/security/maintenance',
  people: '/users/visitors',
};

export function useMore({ guests, environments }: MoreFacts) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { guard, isOwner, has } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const maintenance = useMaintenance(guard.maintenance);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const names = new Map(cameras.map((camera) => [Number(camera.id), camera.name]));
  const keys = moreKeys({
    maintenance: guard.maintenance,
    people: isOwner && has(CAPABILITY.visitorsRead),
  });
  return moreRows(keys, {
    guests,
    environments,
    windows: maintenance.windows,
    cameraName: (id) => names.get(id) ?? '',
    now,
    time: date.formatTime,
    t,
  });
}
