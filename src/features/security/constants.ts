import type { GuardCameraRole, GuardEnvironmentKind, GuardMode, GuardReason, IconName } from '@/core/types';

export const GUARD_MODE_ICONS: Readonly<Record<GuardMode, IconName>> = {
  home: 'home',
  night: 'moon',
  away: 'door-open',
  armed: 'siren',
};

export const GUARD_GUEST_HOURS: readonly number[] = [1, 2, 4, 8, 12, 24];

export const GUARD_GUEST_DEFAULT_HOURS = 4;

export const EPISODE_PAGE_SIZE = { review: 3, read: 5 } as const;

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

export const REASON_KEYS = {
  weapon: 'weapon',
  after_hours: 'after-hours',
  nobody_home: 'nobody-home',
  armed: 'armed',
  night: 'night',
  alert_zone: 'alert-zone',
  several_strangers: 'several-strangers',
  repeat_visits: 'repeat-visits',
  escalating: 'escalating',
  lingering: 'lingering',
  face_hidden: 'face-hidden',
  expected_guest: 'expected-guest',
  with_resident: 'with-resident',
  with_guest: 'with-guest',
  public_hours: 'public-hours',
  staff_hours: 'staff-hours',
  area_in_use: 'area-in-use',
  passerby: 'passerby',
  brief: 'brief',
} as const satisfies Record<GuardReason, string>;

export const WEEK_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const DIGEST_HOUR_OPTIONS: readonly number[] = [-1, ...Array.from({ length: 24 }, (_, hour) => hour)];
