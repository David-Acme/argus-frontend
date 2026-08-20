import { useLocaleStore } from '@/core/stores';
import type { LanguageCode, LanguagePreference, TranslateFn } from '@/core/types';
import { defaultLanguage, localeDictionaries } from './locales';
import { translate } from './translate';

export { defaultLanguage, localeDictionaries };
export { translate };
export type {
  I18nSchema,
  LanguageCode,
  LanguagePreference,
  TranslateFn,
  TranslationKey,
  TranslationParamsOf,
  TranslationParamsRest,
} from '@/core/types';

/** Imperative twin for non-React code (.ts): reads the language at call time. */
export const t: TranslateFn = (key, ...rest) =>
  translate(localeDictionaries[useLocaleStore.getState().language], key, ...rest);

export const getLanguage = (): LanguageCode => useLocaleStore.getState().language;

export const setLanguage = (preference: LanguagePreference): void => {
  useLocaleStore.getState().setLanguage(preference);
};
