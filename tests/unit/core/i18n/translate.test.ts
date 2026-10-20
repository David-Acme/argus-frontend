import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { readableKey, translate } from '@/core/i18n/translate';

Object.assign(globalThis, { __DEV__: false });

const looseTranslate = translate as unknown as (locale: typeof localeDictionaries.es, key: string) => string;

const RAW_KEY = /\b(?:screens|common)\.[a-z0-9-]+\./;

describe('a key the dictionaries do not have never reaches the screen as a key', () => {
  test('an unknown server value under a dynamic key reads as words', () => {
    const text = looseTranslate(localeDictionaries.es, 'screens.security.episodes.state.handed_over');
    expect(text).not.toMatch(RAW_KEY);
    expect(text).toBe('Handed over');
  });

  test('the readable form is the last segment, spaced and capitalised', () => {
    expect(readableKey('screens.security.episodes.subject.household')).toBe('Household');
    expect(readableKey('a.b.needs-review')).toBe('Needs review');
    expect(readableKey('')).toBe('');
  });

  test('a known key still translates', () => {
    expect(translate(localeDictionaries.es, 'screens.security.episodes.subject.other')).toBe('Persona detectada');
  });
});
