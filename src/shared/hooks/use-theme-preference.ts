import { Uniwind } from 'uniwind';
import { create } from 'zustand';
import { storageService } from '@/core/services/storage';
import type { ThemePreference } from '@/core/types/theme.type';
import { THEME_OPTIONS, THEME_STORAGE_KEY } from '@/shared/constants';

export function getThemePreference(): ThemePreference {
  const stored = storageService.getString(THEME_STORAGE_KEY);
  return THEME_OPTIONS.includes(stored as ThemePreference) ? (stored as ThemePreference) : 'system';
}

const useChosenTheme = create<{ preference: ThemePreference | null }>(() => ({ preference: null }));

export function setThemePreference(preference: ThemePreference): void {
  storageService.set(THEME_STORAGE_KEY, preference);
  useChosenTheme.setState({ preference });
  Uniwind.setTheme(preference);
}

export function useThemePreference(): ThemePreference {
  return useChosenTheme((state) => state.preference) ?? getThemePreference();
}
