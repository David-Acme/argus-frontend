import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import { pairingCopy } from '@/features/auth/model/pairing-copy';

Object.assign(globalThis, { __DEV__: false });

describe('pairing speaks of the device in hand', () => {
  test('a computer is never told to scan a QR or that it is a phone', () => {
    for (const language of ['es', 'en'] as const) {
      const copy = pairingCopy(false);
      const text = `${translate(localeDictionaries[language], copy.subtitle)} ${translate(localeDictionaries[language], copy.requirement)}`;
      expect(text).not.toMatch(/tel[eé]fono|phone|escanea|scan/i);
    }
  });

  test('a phone keeps the scan and the phone', () => {
    expect(translate(localeDictionaries.es, pairingCopy(true).subtitle)).toMatch(/Escanea/);
  });
});
