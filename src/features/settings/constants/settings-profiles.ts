import type { IconName } from '@/core/types';

export const PROFILE_ICONS: Readonly<Record<string, IconName>> = {
  performance: 'activity',
  balanced: 'sliders',
  quality: 'sparkles',
};

export const PROFILE_FALLBACK_ICON: IconName = 'sliders';

export const PROFILE_TARGETS_SHOWN = 4;

export const SETTINGS_MODE_STORAGE_KEY = 'settings.mode';
