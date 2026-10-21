import { mock } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';

const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

mock.module('@/shared/hooks/use-translation', () => ({
  useTranslation: () => ({ t, tk: (key: string) => key, language: 'es', preference: 'es' }),
}));
