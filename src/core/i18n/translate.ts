import type { SupportedLanguage } from '@/shared/constants';
import { DEFAULT_FALLBACK_LANGUAGE } from '@/shared/constants';
import { DEFAULT_NAMESPACE, resources, type Namespace } from './resource';

export type TranslateOptions = {
  count?: number;
  defaultValue?: string;
} & Record<string, string | number | boolean | undefined>;

function resolvePath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === 'object' && segment in acc) {
      return (acc as Record<string, unknown>)[segment];
    }
    return undefined;
  }, source);
}

function pluralize(base: string, count: number): string {
  const suffix = count === 1 ? '_one' : '_other';
  return `${base}${suffix}`;
}

function interpolate(template: string, options?: TranslateOptions): string {
  if (!options) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const value = options[key];
    return value === undefined ? match : String(value);
  });
}

function lookup(language: SupportedLanguage, namespace: Namespace, key: string): unknown {
  const bundle = resources[language]?.[namespace];
  return resolvePath(bundle, key);
}

export function translate(
  language: SupportedLanguage,
  namespace: Namespace,
  key: string,
  options?: TranslateOptions
): string {
  const hasCount = typeof options?.count === 'number';
  const lookupKey = hasCount ? pluralize(key, options.count as number) : key;

  let value = lookup(language, namespace, lookupKey);

  if (value === undefined && hasCount) {
    value = lookup(language, namespace, key);
  }

  if (value === undefined && language !== DEFAULT_FALLBACK_LANGUAGE) {
    value = lookup(DEFAULT_FALLBACK_LANGUAGE, namespace, lookupKey);
    if (value === undefined && hasCount) {
      value = lookup(DEFAULT_FALLBACK_LANGUAGE, namespace, key);
    }
  }

  if (typeof value !== 'string') {
    return options?.defaultValue ?? `${namespace}:${key}`;
  }

  return interpolate(value, options);
}

export { DEFAULT_NAMESPACE };
