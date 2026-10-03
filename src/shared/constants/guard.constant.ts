import type { GuardMode, IconName } from '@/core/types';

export const GUARD_LIST_LIMIT = 30;

export const GUARD_MODES: readonly GuardMode[] = ['home', 'night', 'away', 'armed'];

export const GUARD_MODE_ICONS: Readonly<Record<GuardMode, IconName>> = {
  home: 'home',
  night: 'moon',
  away: 'door-open',
  armed: 'siren',
};

export const GUARD_GUEST_HOURS: readonly number[] = [1, 2, 4, 8, 12, 24];

export const GUARD_GUEST_DEFAULT_HOURS = 4;
