import type {
  GuardCameraRole,
  GuardEnvironmentKind,
  GuardMode,
  IconName,
  TranslationKey,
} from '@/core/types';
import type { IconGlyph } from '@/shared/ui/icon';

export const MODE_ORDER: readonly GuardMode[] = ['home', 'night', 'away', 'armed'];

export const MODE_LABEL: Readonly<Record<GuardMode, TranslationKey>> = {
  home: 'screens.security.mode.home',
  night: 'screens.security.mode.night',
  away: 'screens.security.mode.away',
  armed: 'screens.security.mode.armed',
};

export const MODE_SHORT: Readonly<Record<GuardMode, TranslationKey>> = {
  home: 'screens.security.mode-short.home',
  night: 'screens.security.mode-short.night',
  away: 'screens.security.mode-short.away',
  armed: 'screens.security.mode-short.armed',
};

export const MODE_META: Readonly<Record<GuardMode, TranslationKey>> = {
  home: 'screens.security.hero.meta-home',
  night: 'screens.security.hero.meta-night',
  away: 'screens.security.hero.meta-away',
  armed: 'screens.security.hero.meta-armed',
};

export const MODE_GLYPH: Readonly<Partial<Record<GuardMode, IconGlyph>>> = {
  home: 'home',
  night: 'moon',
};

export const PLACE_GLYPH: Readonly<Record<GuardEnvironmentKind, IconGlyph>> = {
  home: 'home',
  office: 'door',
  commercial: 'door',
  restaurant: 'door',
  warehouse: 'door',
  outdoor: 'globe',
};

export const GUARD_MODE_ICONS: Readonly<Record<GuardMode, IconName>> = {
  home: 'home',
  night: 'moon',
  away: 'door-open',
  armed: 'siren',
};

export const GUARD_GUEST_HOURS: readonly number[] = [1, 2, 4, 8, 12, 24];

export const GUARD_GUEST_DEFAULT_HOURS = 4;

export const ENVIRONMENT_KINDS: readonly GuardEnvironmentKind[] = [
  'home',
  'office',
  'commercial',
  'restaurant',
  'warehouse',
  'outdoor',
];

export const ENVIRONMENT_KIND_ICONS: Readonly<Record<GuardEnvironmentKind, IconName>> = {
  home: 'home',
  office: 'building',
  commercial: 'store',
  restaurant: 'utensils',
  warehouse: 'warehouse',
  outdoor: 'trees',
};

export const ENVIRONMENT_NAME_MAX = 60;

export const QUIET_HOUR_OPTIONS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

export const CAMERA_ROLES: readonly GuardCameraRole[] = [
  'entrance',
  'perimeter',
  'garage',
  'living',
  'kitchen',
  'office',
  'register',
  'storage',
  'public_area',
  'other',
];

export const CAMERA_ROLE_ICONS: Readonly<Record<GuardCameraRole, IconName>> = {
  other: 'camera',
  entrance: 'door-open',
  perimeter: 'trees',
  garage: 'car',
  living: 'sofa',
  kitchen: 'chef-hat',
  office: 'briefcase',
  register: 'banknote',
  storage: 'package',
  public_area: 'users',
};

export const CAMERA_ROLE_KEYS = {
  other: 'other',
  entrance: 'entrance',
  perimeter: 'perimeter',
  garage: 'garage',
  living: 'living',
  kitchen: 'kitchen',
  office: 'office',
  register: 'register',
  storage: 'storage',
  public_area: 'public-area',
} as const satisfies Record<GuardCameraRole, string>;

export const CAMERA_ROLE_OUTDOOR: readonly GuardCameraRole[] = ['entrance', 'perimeter'];

export const WEEK_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const DIGEST_HOUR_OPTIONS: readonly number[] = [
  -1,
  ...Array.from({ length: 24 }, (_, hour) => hour),
];

export const EPISODE_MARKED_RETENTION_DAYS = 120;
