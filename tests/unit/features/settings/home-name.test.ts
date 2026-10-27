import { describe, expect, test } from 'bun:test';
import type { Setting, SettingsOverview, SettingsOwner } from '@/core/types';
import {
  checkHomeName,
  homeNameSettingOf,
  refusedHomeName,
  tidyHomeName,
} from '@/features/settings/model/home-name';
import { serviceOwners } from '@/features/settings/model/services';

const homeName = (value: string): Setting => ({
  key: 'identity.home_name',
  group: 'household',
  type: 'text',
  level: 'basic',
  apply: 'live',
  min: 0,
  max: 0,
  step: 0,
  choices: [],
  value,
  fallback: '',
});

const identity = (reachable: boolean, value = 'Casa Acme'): SettingsOwner => ({
  service: 'identity',
  reachable,
  configured: true,
  settings: reachable ? [homeName(value)] : [],
});

const tts: SettingsOwner = { service: 'tts', reachable: true, configured: true, settings: [] };

describe('the home name is checked as the server checks it', () => {
  test('it is composed, trimmed and its inner spaces collapsed', () => {
    expect(tidyHomeName('  Casa   Acme  ')).toBe('Casa Acme');
    expect(tidyHomeName('Casa Peña')).toBe('Casa Peña');
    expect(checkHomeName(' Casa Acme ')).toEqual({ value: 'Casa Acme', error: null });
  });

  test('an empty name clears it', () => {
    expect(checkHomeName('   ')).toEqual({ value: '', error: null });
  });

  test('it counts characters up to forty', () => {
    expect(checkHomeName('ñ'.repeat(40)).error).toBeNull();
    expect(checkHomeName('a'.repeat(41)).error).toBe('screens.settings.household.errors.long');
  });

  test('control characters and direction overrides are refused, a joined emoji is not', () => {
    expect(checkHomeName('Casa\tAcme').error).toBe('screens.settings.household.errors.invalid');
    expect(checkHomeName('Casa‮emcA').error).toBe('screens.settings.household.errors.invalid');
    expect(checkHomeName('\u{1F468}‍\u{1F469} Casa').error).toBeNull();
  });

  test('the server refusal of the key is the field error, any other is not', () => {
    expect(
      refusedHomeName({
        code: 'VALIDATION_ERROR',
        message: 'x',
        fields: { 'identity.home_name': ['invalid'] },
      })
    ).toBe('screens.settings.household.errors.invalid');
    expect(refusedHomeName({ code: 'SERVICE_UNAVAILABLE', message: 'x' })).toBeNull();
    expect(refusedHomeName(null)).toBeNull();
  });
});

describe('the home name in the settings overview', () => {
  test('it is read from the identity owner while it answers', () => {
    const overview: SettingsOverview = { owners: [tts, identity(true)] };
    expect(homeNameSettingOf(overview)?.value).toBe('Casa Acme');
    expect(homeNameSettingOf({ owners: [tts, identity(false)] })).toBeNull();
    expect(homeNameSettingOf({ owners: [tts] })).toBeNull();
  });

  test('the identity owner is the Casa section, never a service row', () => {
    expect(serviceOwners({ owners: [identity(true), tts] }).map((owner) => owner.service)).toEqual([
      'tts',
    ]);
  });
});
