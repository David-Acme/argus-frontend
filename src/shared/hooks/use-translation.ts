import { useMemo } from 'react';
import { localeDictionaries, translate, translateLoose } from '@/core/i18n';
import { useLocaleStore } from '@/core/stores';
import type { LanguageCode, LanguagePreference, TranslateFn } from '@/core/types';

type UseTranslationResult = {
  t: TranslateFn;
  /** Untyped lookup for validation messages; falls back to the string itself. */
  tk: (key: string) => string;
  language: LanguageCode;
  preference: LanguagePreference;
};

/**
 * Reactive translation hook: subscribes to `useLocaleStore`, so every consumer
 * re-renders when the language changes (100% real-time). `t` is rebuilt only
 * when the resolved language changes.
 */
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
