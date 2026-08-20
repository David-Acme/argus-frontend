import type { LanguageCode, LanguagePreference } from '@/core/types';

export const I18N_STORAGE_KEY = 'app.language';

export const I18N_DEFAULT_LANGUAGE: LanguageCode = 'es';

export const SUPPORTED_LANGUAGES: readonly LanguageCode[] = ['es', 'en'];

export const LANGUAGE_OPTIONS: readonly LanguagePreference[] = ['system', 'es', 'en'];
