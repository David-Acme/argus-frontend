import type { GuardEnvironment, TranslateFn } from '@/core/types';
import { MODE_LABEL } from '@/features/security/constants/security.constant';
import { defaultEnvironment } from '@/features/security/model/environments';

export type PlacePick = number | 'all';

export type PlaceScope = {
  place: GuardEnvironment | null;
  environments: readonly GuardEnvironment[];
  several: boolean;
};

export function placeScope(
  environments: readonly GuardEnvironment[],
  pick: PlacePick | null
): PlaceScope {
  const several = environments.length > 1;
  if (pick === 'all' && several) return { place: null, environments, several };
  const place =
    environments.find((environment) => environment.id === pick) ?? defaultEnvironment(environments);
  return { place, environments: place ? [place] : [], several };
}

export function placeTitle(scope: PlaceScope, t: TranslateFn): string {
  return scope.place?.name ?? t('screens.security.all-places');
}

export function placeMeta(environment: GuardEnvironment, cameras: number, t: TranslateFn): string {
  const count =
    cameras === 0
      ? t('screens.security.places-screen.no-cameras')
      : cameras === 1
        ? t('screens.security.places-screen.cameras-one')
        : t('screens.security.places-screen.cameras', { count: String(cameras) });
  return t('screens.security.places-screen.meta', {
    mode: t(MODE_LABEL[environment.effectiveMode]),
    cameras: count,
  });
}
