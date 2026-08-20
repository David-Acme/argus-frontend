import type { I18nSchema, LanguageCode } from '@/core/types';
import { en } from './en';
import { es } from './es';

// `satisfies` enforces the `es`-derived shape on every locale (missing/renamed
// keys fail tsc) while keeping the literal type for `TranslationKey` derivation.
export const localeDictionaries = { es, en } as const satisfies Record<LanguageCode, I18nSchema>;

export const defaultLanguage = 'es';
