import type { ThemePreference } from '@/core/types/theme.type';
import type { IconName } from '@/core/types/icon.type';

export const THEME_STORAGE_KEY = 'app.theme';

export const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_ICONS: Record<ThemePreference, IconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
};
