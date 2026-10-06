import { describe, expect, test } from 'bun:test';
import type { SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { moduleOfOwner, withActiveOwners } from '@/features/settings/model/settings-modules';

const owner = (service: SettingsOwnerName) => ({ service, settings: [] }) as unknown as SettingsOwner;

const overview: SettingsOverview = {
  owners: (['llm', 'voice', 'tts', 'stt', 'vlm', 'guard', 'camera', 'notification'] as const).map(owner),
};

const surveillanceOff = (id: string) => id === 'core';

describe('settings groups by module', () => {
  test('cameras, guard and vision belong to surveillance and the rest to the core', () => {
    expect(moduleOfOwner('camera')).toBe('surveillance');
    expect(moduleOfOwner('guard')).toBe('surveillance');
    expect(moduleOfOwner('vlm')).toBe('surveillance');
    expect(moduleOfOwner('llm')).toBe('core');
    expect(moduleOfOwner('notification')).toBe('core');
  });

  test('with surveillance off the owner sees no camera, guard or vision group', () => {
    expect(withActiveOwners(overview, surveillanceOff).owners.map((entry) => entry.service)).toEqual([
      'llm',
      'voice',
      'tts',
      'stt',
      'notification',
    ]);
  });

  test('with every module on the same overview is kept as it is', () => {
    expect(withActiveOwners(overview, () => true)).toBe(overview);
  });
});
