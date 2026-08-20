export type LanguageCode = 'es' | 'en';

export type LanguagePreference = 'system' | LanguageCode;

// Derived from the `es` dictionary so keys and interpolation params are fully
// typed (derivation machinery lives in `core/i18n/locales/schema.ts`).
export type {
  I18nSchema,
  TranslateFn,
  TranslationKey,
  TranslationParamsOf,
  TranslationParamsRest,
} from '@/core/i18n/locales/schema';
