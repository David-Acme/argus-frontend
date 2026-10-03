import { useMemo } from 'react';
import { localeDictionaries, translate, translateLoose } from '@/core/i18n';
import { useLocaleStore } from '@/core/stores';
import type { LanguageCode, LanguagePreference, TranslateFn } from '@/core/types';

type UseTranslationResult = {
  t: TranslateFn;
  tk: (key: string) => string;
  language: LanguageCode;
  preference: LanguagePreference;
};

export function useTranslation(): UseTranslationResult {
  const language = useLocaleStore((s) => s.language);
  const preference = useLocaleStore((s) => s.preference);

  const t = useMemo<TranslateFn>(
    () => (key, ...rest) => translate(localeDictionaries[language], key, ...rest),
    [language],
  );

  const tk = useMemo(
    () => (key: string) => translateLoose(localeDictionaries[language], key),
    [language],
  );

  return { t, tk, language, preference };
}
