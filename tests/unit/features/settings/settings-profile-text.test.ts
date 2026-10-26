import { describe, expect, mock, test } from 'bun:test';

mock.module('@/core/i18n', () => ({
  t: (key: string) => key,
  tk: (key: string) =>
    key === 'screens.settings.profiles.items.balanced.name' ? 'Equilibrado' : key,
}));

const { profileName, settingLabel } = await import('@/features/settings/model/profile-text');

describe('profile text', () => {
  test('a known profile reads by its name and an unknown one by its id', () => {
    expect(profileName('balanced')).toBe('Equilibrado');
    expect(profileName('custom')).toBe('custom');
  });

  test('a setting without a label reads by its key', () => {
    expect(settingLabel('tts.unknown')).toBe('tts.unknown');
  });
});
