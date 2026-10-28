export type LanguageCode = 'es' | 'en';

export type LanguagePreference = 'system' | LanguageCode;

export type {
  I18nSchema,
  TranslateFn,
  TranslationKey,
  TranslationParamsOf,
  TranslationParamsRest,
} from '@/core/locales/schema';
