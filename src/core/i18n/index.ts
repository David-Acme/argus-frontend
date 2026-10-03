import { useLocaleStore } from '@/core/stores';
import type { LanguageCode, LanguagePreference, TranslateFn } from '@/core/types';
import { defaultLanguage, localeDictionaries } from './locales';
import { translate, translateLoose } from './translate';

export { defaultLanguage, localeDictionaries };
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
  translate(localeDictionaries[useLocaleStore.getState().language], key, ...rest);

export const tk = (key: string): string =>
  translateLoose(localeDictionaries[useLocaleStore.getState().language], key);

export const getLanguage = (): LanguageCode => useLocaleStore.getState().language;

export const setLanguage = (preference: LanguagePreference): void => {
  useLocaleStore.getState().setLanguage(preference);
};
