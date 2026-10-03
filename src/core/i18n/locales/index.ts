import type { I18nSchema, LanguageCode } from '@/core/types';
import { en } from './en';
import { es } from './es';

export const localeDictionaries = { es, en } as const satisfies Record<LanguageCode, I18nSchema>;

export const defaultLanguage = 'es';
