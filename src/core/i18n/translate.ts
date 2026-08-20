import type {
  I18nSchema,
  TranslationKey,
  TranslationParamsOf,
  TranslationParamsRest,
} from '@/core/types';
import { defaultLanguage, localeDictionaries } from './locales';

const INTERPOLATION_RE = /\{(\w+)\}/g;

function resolvePath(locale: I18nSchema, key: string): string | undefined {
  let current: unknown = locale;
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/** Pure engine: resolves the key, falls back to the default locale and interpolates. */
export function translate<K extends TranslationKey>(
  locale: I18nSchema,
  key: K,
  ...rest: TranslationParamsRest<TranslationParamsOf<K>>
): string {
  const params = rest[0];

  let value = resolvePath(locale, key);
  if (value === undefined) {
    value = resolvePath(localeDictionaries[defaultLanguage], key);
  }
  if (value === undefined) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[i18n] missing translation key: ${key}`);
    }
    return key;
  }

  return value.replace(INTERPOLATION_RE, (match, name: string) => {
    if (params !== undefined && name in params) {
      return String((params as Record<string, string | number>)[name]);
    }
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[i18n] missing interpolation param "{${name}}" for key: ${key}`);
    }
    return match;
  });
}
