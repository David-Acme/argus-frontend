import { useLocaleStore } from '@/core/stores';
import type { LanguageCode, LanguagePreference, TranslateFn } from '@/core/types';
import { defaultLanguage, dictionaryLoaded, dictionaryOf, loadDictionary } from '@/core/locales';
import { translate, translateLoose } from './translate';

export { defaultLanguage, dictionaryLoaded, dictionaryOf, loadDictionary };
export { translate, translateLoose };
export type {
  I18nSchema,
  LanguageCode,
  LanguagePreference,
  TranslateFn,
  TranslationKey,
  TranslationParamsOf,
  TranslationParamsRest,
} from '@/core/types';

export const t: TranslateFn = (key, ...rest) =>
  translate(dictionaryOf(useLocaleStore.getState().language), key, ...rest);

export const tk = (key: string): string =>
  translateLoose(dictionaryOf(useLocaleStore.getState().language), key);

export const getLanguage = (): LanguageCode => useLocaleStore.getState().language;

export const setLanguage = (preference: LanguagePreference): void => {
  useLocaleStore.getState().setLanguage(preference);
};
