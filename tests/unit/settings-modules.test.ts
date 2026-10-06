import { describe, expect, test } from 'bun:test';
import type { SettingsOverview, SettingsOwner, SettingsOwnerName } from '@/core/types';
import { moduleOfOwner, withActiveOwners } from '@/features/settings/model/settings-modules';
import { moduleOfNotification, notificationVisible } from '@/features/home/model/notification-modules';

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

describe('notification kinds by module', () => {
  const row = (type: string, kind?: string) => ({ type, data: kind ? { kind } : {} });

  test('guard and camera kinds belong to surveillance and agenda kinds to productivity', () => {
    expect(moduleOfNotification(row('camera', 'guard_episode'))).toBe('surveillance');
    expect(moduleOfNotification(row('camera'))).toBe('surveillance');
    expect(moduleOfNotification(row('system', 'agenda_event'))).toBe('productivity');
  });

  test('panic, calls, reminders and module requests are core', () => {
    expect(moduleOfNotification(row('camera', 'guard_panic'))).toBe('core');
    expect(moduleOfNotification(row('call', 'call'))).toBe('core');
    expect(moduleOfNotification(row('reminder', 'assistant_reminder'))).toBe('core');
    expect(moduleOfNotification(row('module_request', 'module_request'))).toBe('core');
    expect(moduleOfNotification(row('system'))).toBe('core');
  });

  test('a notification is hidden only while its module is off, and kept otherwise', () => {
    expect(notificationVisible(row('camera', 'guard_episode'), surveillanceOff)).toBe(false);
    expect(notificationVisible(row('camera', 'guard_panic'), surveillanceOff)).toBe(true);
    expect(notificationVisible(row('camera', 'guard_episode'), () => true)).toBe(true);
  });
});
