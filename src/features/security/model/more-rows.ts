import type {
  GuardEnvironment,
  GuardExpectedGuest,
  MaintenanceWindow,
  TranslateFn,
} from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export type MoreKey = 'visits' | 'places' | 'maintenance' | 'people';

export type MoreAccess = { maintenance: boolean; people: boolean };

export type MoreFacts = {
  guests: readonly GuardExpectedGuest[];
  environments: readonly GuardEnvironment[];
  windows: readonly MaintenanceWindow[];
  cameraName: (id: number) => string;
  now: number;
  time: (value: Date) => string;
  t: TranslateFn;
};

export type MoreRow = { key: MoreKey; icon: IconGlyph; title: string; meta: string };

const GLYPH: Readonly<Record<MoreKey, IconGlyph>> = {
  visits: 'door',
  places: 'pin',
  maintenance: 'wrench',
  people: 'users',
};

export function moreKeys(access: MoreAccess): MoreKey[] {
  return [
    'visits',
    'places',
    ...(access.maintenance ? (['maintenance'] as const) : []),
    ...(access.people ? (['people'] as const) : []),
  ];
}

export function activeGuests(
  guests: readonly GuardExpectedGuest[],
  now: number
): GuardExpectedGuest[] {
  return guests
    .filter((guest) => guest.validUntil * 1000 > now)
    .sort((left, right) => left.validUntil - right.validUntil);
}

function visitsMeta({ guests, now, time, t }: MoreFacts): string {
  const active = activeGuests(guests, now);
  const [first] = active;
  if (!first) return t('screens.security.more.visits-none');
  if (active.length > 1)
    return t('screens.security.more.visits-count', { count: String(active.length) });
  return t('screens.security.more.visit-until', {
    name: first.description,
    time: time(new Date(first.validUntil * 1000)),
  });
}

function maintenanceMeta({ windows, cameraName, time, t }: MoreFacts): string {
  const active = windows.find((window) => window.active);
  if (!active) return t('screens.security.more.maintenance-none');
  return t('screens.security.more.maintenance-active', {
    names: active.cameraIds.map(cameraName).join(', '),
    time: time(new Date(active.endsAt * 1000)),
  });
}

function metaOf(key: MoreKey, facts: MoreFacts): string {
  switch (key) {
    case 'visits':
      return visitsMeta(facts);
    case 'places':
      return facts.environments.map((environment) => environment.name).join(', ');
    case 'maintenance':
      return maintenanceMeta(facts);
    case 'people':
      return facts.t('screens.security.more.people-detail');
  }
}

const TITLE = {
  visits: 'screens.security.more.visits',
  places: 'screens.security.more.places',
  maintenance: 'screens.security.more.maintenance',
  people: 'screens.security.more.people',
} as const;

export function moreRows(keys: readonly MoreKey[], facts: MoreFacts): MoreRow[] {
  return keys.map((key) => ({
    key,
    icon: GLYPH[key],
    title: facts.t(TITLE[key]),
    meta: metaOf(key, facts),
  }));
}
