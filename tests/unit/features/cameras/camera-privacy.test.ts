import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import {
  privacyApplyConfirm,
  privacyStateOf,
} from '@/features/cameras/model/camera-device';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

describe('the privacy state the settings row shows', () => {
  test('a state that is not known is unknown, never off', () => {
    expect(privacyStateOf(null)).toBe('unknown');
    expect(privacyStateOf(undefined)).toBe('unknown');
    expect(privacyStateOf(false)).toBe('off');
    expect(privacyStateOf(true)).toBe('on');
  });

  test('the unknown state has words of its own', () => {
    expect(es('screens.cameras.privacy-unknown')).toBe('Estado desconocido');
    expect(en('screens.cameras.privacy-unknown')).toBe('Unknown state');
  });
});

describe('the confirmation before masking', () => {
  const copy = {
    title: es('screens.cameras.privacy'),
    description: es('screens.cameras.privacy-confirm'),
  };

  test('turning privacy on asks first, in the ruled words', () => {
    expect(es('screens.cameras.privacy-confirm')).toBe(
      'Argus dejará de ver, escuchar y grabar esta cámara.'
    );
    expect(en('screens.cameras.privacy-confirm')).toBe(
      'Argus will stop seeing, hearing and recording this camera.'
    );
    expect(privacyApplyConfirm(true, copy)).toEqual({
      title: 'Modo privacidad',
      description: 'Argus dejará de ver, escuchar y grabar esta cámara.',
      intent: 'warning',
    });
  });

  test('turning privacy off does not ask', () => {
    expect(privacyApplyConfirm(false, copy)).toBeUndefined();
  });
});

describe('the placeholder the masked surfaces show', () => {
  test('it is one name in both languages', () => {
    expect(es('screens.cameras.privacy-placeholder')).toBe('En modo privacidad');
    expect(en('screens.cameras.privacy-placeholder')).toBe('In privacy mode');
    expect(es('screens.cameras.privacy-placeholder-hint')).toBe('Argus no ve, no escucha ni graba esta cámara.');
    expect(en('screens.cameras.privacy-placeholder-hint')).toBe('Argus does not see, hear or record this camera.');
  });
});
