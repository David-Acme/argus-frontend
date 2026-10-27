import type { ThemePreference } from '@/core/types/theme.type';
import type { IconName } from '@/core/types/icon.type';

export const THEME_STORAGE_KEY = 'app.theme';

export const REDUCE_EFFECTS_STORAGE_KEY = 'app.reduce-effects';

export const HAPTICS_STORAGE_KEY = 'app.haptics';

export const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const THEME_ICONS: Record<ThemePreference, IconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
};

export const MICROPHONE_STORAGE_KEY = 'app.microphone';
