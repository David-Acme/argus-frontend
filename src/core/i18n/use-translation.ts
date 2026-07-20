import { useCallback } from 'react';
import type { SupportedLanguage } from '@/shared/constants';
import { useI18nStore } from './store';
import { DEFAULT_NAMESPACE, translate, type TranslateOptions } from './translate';
import type { Namespace } from './resource';

export function useTranslation(namespace: Namespace = DEFAULT_NAMESPACE) {
  const language = useI18nStore((state) => state.language);
  const setLanguage = useI18nStore((state) => state.setLanguage);

  const t = useCallback(
    (key: string, options?: TranslateOptions & { ns?: Namespace }) => {
      const { ns = namespace, ...rest } = options ?? {};
      return translate(language, ns, key, rest);
    },
    [language, namespace]
  );

  return {
    t,
    language,
    setLanguage: setLanguage as (language: SupportedLanguage) => void,
  };
}
