export const SupportedLanguages = ['es', 'en'] as const;

export type SupportedLanguage = (typeof SupportedLanguages)[number];

export const DEFAULT_FALLBACK_LANGUAGE: SupportedLanguage = 'en';

export const STORAGE_KEY = {
  LANGUAGE: 'app.language',
} as const;
