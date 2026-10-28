import type { I18nSchema, LanguageCode } from '@/core/types';
import { common as englishCommon } from './en/common';
import { welcome as englishWelcome } from './en/screens/welcome';
import { es } from './es';

export const defaultLanguage = 'es';

const englishBoot: I18nSchema = {
  ...es,
  common: englishCommon,
  screens: { ...es.screens, welcome: englishWelcome },
};

let english: I18nSchema | null = null;
let englishLoad: Promise<void> | null = null;

export const dictionaryLoaded = (language: LanguageCode): boolean =>
  language !== 'en' || english !== null;

export const dictionaryOf = (language: LanguageCode): I18nSchema =>
  language === 'en' ? (english ?? englishBoot) : es;

export function loadDictionary(language: LanguageCode): Promise<void> {
  if (dictionaryLoaded(language)) return Promise.resolve();
  englishLoad ??= import('./english').then(
    (module) => {
      english = module.en;
    },
    () => {
      englishLoad = null;
    }
  );
  return englishLoad;
}
