import * as Localization from 'expo-localization';
import { storageService } from '@/core/services/storage';
import {
  DEFAULT_FALLBACK_LANGUAGE,
  STORAGE_KEY,
  SupportedLanguages,
  type SupportedLanguage,
} from '@/shared/constants';

function isSupported(value: string | null | undefined): value is SupportedLanguage {
  return !!value && SupportedLanguages.includes(value as SupportedLanguage);
}

function normalize(code: string | null | undefined): SupportedLanguage {
  if (!code) return DEFAULT_FALLBACK_LANGUAGE;
  const base = code.split('-')[0].toLowerCase();
  return isSupported(base) ? base : DEFAULT_FALLBACK_LANGUAGE;
}

function detectDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales?.() ?? [];
  const first = locales[0];
  const code = first?.languageTag ?? first?.languageCode ?? DEFAULT_FALLBACK_LANGUAGE;
  return normalize(code);
}

export function detectLanguage(): SupportedLanguage {
  const saved = storageService.getString(STORAGE_KEY.LANGUAGE);
  if (isSupported(saved)) return saved;
  return detectDeviceLanguage();
}

export function persistLanguage(language: SupportedLanguage): void {
  storageService.set(STORAGE_KEY.LANGUAGE, language);
}
