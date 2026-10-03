import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { storageService } from '@/core/services/storage';
import { I18N_DEFAULT_LANGUAGE, I18N_STORAGE_KEY, SUPPORTED_LANGUAGES } from '@/shared/constants';
import type { LanguageCode, LanguagePreference } from '@/core/types';

const readPreference = (): LanguagePreference => {
  const stored = storageService.getString(I18N_STORAGE_KEY);
  if (stored === 'system') {
    return 'system';
  }
  return SUPPORTED_LANGUAGES.includes(stored as LanguageCode) ? (stored as LanguageCode) : 'system';
};

const resolveLanguage = (preference: LanguagePreference): LanguageCode => {
  if (preference !== 'system') {
    return preference;
  }
  const locale = getLocales()[0];
  const tag = (locale?.languageTag ?? locale?.languageCode ?? '').toLowerCase();
  if (tag === 'es' || tag.startsWith('es-')) {
    return 'es';
  }
  if (tag === 'en' || tag.startsWith('en-')) {
    return 'en';
  }
  return I18N_DEFAULT_LANGUAGE;
};

const initialPreference = readPreference();

type LocaleStoreState = {
  preference: LanguagePreference;
  language: LanguageCode;
  setLanguage: (preference: LanguagePreference) => void;
};

export const useLocaleStore = create<LocaleStoreState>((set) => ({
  preference: initialPreference,
  language: resolveLanguage(initialPreference),
  setLanguage: (preference) => {
    storageService.set(I18N_STORAGE_KEY, preference);
    set({ preference, language: resolveLanguage(preference) });
  },
}));
