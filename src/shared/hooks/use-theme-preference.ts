import { storageService } from '@/core/services/storage';
import type { ThemePreference } from '@/core/types/theme.type';
import { THEME_OPTIONS, THEME_STORAGE_KEY } from '@/shared/constants';
import { Uniwind } from 'uniwind';

export function getThemePreference(): ThemePreference {
  const stored = storageService.getString(THEME_STORAGE_KEY);
  return THEME_OPTIONS.includes(stored as ThemePreference) ? (stored as ThemePreference) : 'system';
}

export function setThemePreference(preference: ThemePreference): void {
  storageService.set(THEME_STORAGE_KEY, preference);
  Uniwind.setTheme(preference);
}
