import { create } from 'zustand';
import type { SupportedLanguage } from '@/shared/constants';
import { detectLanguage, persistLanguage } from './detector';
import { DEFAULT_NAMESPACE, translate, type TranslateOptions } from './translate';
import type { Namespace } from './resource';

type I18nState = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
};

export const useI18nStore = create<I18nState>((set) => ({
  language: detectLanguage(),
  setLanguage: (language) => {
    persistLanguage(language);
    set({ language });
  },
}));

export function getLanguage(): SupportedLanguage {
  return useI18nStore.getState().language;
}

export function setLanguage(language: SupportedLanguage): void {
  useI18nStore.getState().setLanguage(language);
}

export function t(
  key: string,
  options?: TranslateOptions & { ns?: Namespace }
): string {
  const { ns = DEFAULT_NAMESPACE, ...rest } = options ?? {};
  return translate(getLanguage(), ns, key, rest);
}
