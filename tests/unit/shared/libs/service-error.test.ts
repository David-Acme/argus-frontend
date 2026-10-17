import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { IApiError } from '@/core/interfaces';
import { WRITE_NOT_SENT, WRITE_UNCONFIRMED } from '@/core/services/http/write-refusal';
import type { LanguageCode, TranslationKey } from '@/core/types';
import { isRetryableServiceError, serviceErrorKey } from '@/shared/libs/service-error';

const LANGUAGES: readonly LanguageCode[] = ['es', 'en'];

type RefusalCopy = {
  code: string;
  key: TranslationKey;
};

const [NOT_SENT, UNCONFIRMED]: readonly [RefusalCopy, RefusalCopy] = [
  { code: WRITE_NOT_SENT, key: 'common.errors.write-not-sent' },
  { code: WRITE_UNCONFIRMED, key: 'common.errors.write-unconfirmed' },
];

const refusal = (code: string): IApiError => ({ code, message: code });

const spoken = (language: LanguageCode, key: TranslationKey): string =>
  translate(localeDictionaries[language], key);

describe('the copy of a write that did not reach the server', () => {
  test('every language the app ships answers it with its own words', () => {
    for (const language of LANGUAGES) {
      for (const { key } of [NOT_SENT, UNCONFIRMED]) {
        const text = spoken(language, key);
        expect(text).not.toBe(key);
        expect(text.length).toBeGreaterThan(20);
      }
    }
  });

  test('the two refusals are told apart, never one message for both', () => {
    for (const language of LANGUAGES) {
      expect(spoken(language, NOT_SENT.key)).not.toBe(spoken(language, UNCONFIRMED.key));
    }
    expect(spoken('es', NOT_SENT.key)).not.toBe(spoken('en', NOT_SENT.key));
  });
});

describe('the refusal codes the app answers with', () => {
  test('each code reaches the copy that tells what happened to the change', () => {
    for (const { code, key } of [NOT_SENT, UNCONFIRMED]) {
      expect(serviceErrorKey(refusal(code))).toBe(key);
    }
  });

  test('a refused write is offered a user-answered retry, never a silent queue', () => {
    expect(isRetryableServiceError(refusal(WRITE_NOT_SENT))).toBe(true);
    expect(isRetryableServiceError(refusal(WRITE_UNCONFIRMED))).toBe(true);
    expect(isRetryableServiceError(refusal('FORBIDDEN'))).toBe(false);
  });
});
