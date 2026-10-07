import { describe, expect, test } from 'bun:test';
import type { I18nSchema, TranslationKey } from '@/core/types';
import { localeDictionaries } from '@/core/i18n/locales';
import { COMPOSE_ACTIONS, COMPOSE_ACTION_LABEL_KEYS, SCREEN_TITLE_KEYS } from '@/shared/constants';

const valueAt = (dictionary: I18nSchema, key: string): string => {
  const value = key
    .split('.')
    .reduce<unknown>(
      (current, part) =>
        typeof current === 'object' && current !== null
          ? (current as Record<string, unknown>)[part]
          : undefined,
      dictionary
    );
  return typeof value === 'string' ? value : '';
};

const screenTitleKeyOf = (route: string): TranslationKey => {
  const key = SCREEN_TITLE_KEYS[route.slice(1) as keyof typeof SCREEN_TITLE_KEYS];
  if (!key) throw new Error(`the compose route ${route} opens no screen with a title key`);
  return key;
};

describe('the compose destinations', () => {
  test('every entry opens a plain view, never a form and never a query', () => {
    for (const action of COMPOSE_ACTIONS) {
      expect(action.route.startsWith('/')).toBe(true);
      expect(action.route).not.toContain('?');
      expect(action.route).not.toContain('=');
    }
    expect(new Set(COMPOSE_ACTIONS.map((action) => action.route)).size).toBe(COMPOSE_ACTIONS.length);
  });

  test('every label key is the title key of the screen its route opens', () => {
    for (const action of COMPOSE_ACTIONS) {
      if (action.id === 'voice') {
        expect<string>(COMPOSE_ACTION_LABEL_KEYS.voice).toBe('screens.home.talk');
        continue;
      }
      expect<string>(COMPOSE_ACTION_LABEL_KEYS[action.id]).toBe(screenTitleKeyOf(action.route));
    }
  });

  test('every label resolves in both languages', () => {
    for (const dictionary of [localeDictionaries.es, localeDictionaries.en]) {
      for (const action of COMPOSE_ACTIONS) {
        expect(valueAt(dictionary, COMPOSE_ACTION_LABEL_KEYS[action.id]).length).toBeGreaterThan(0);
      }
    }
  });
});
