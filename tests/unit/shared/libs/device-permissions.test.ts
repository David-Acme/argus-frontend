import { describe, expect, test } from 'bun:test';
import {
  missingRuntime,
  permissionsFor,
  visiblePermissions,
} from '@/shared/libs/device-permissions';

describe('the device permissions each platform asks for', () => {
  test('Android asks the call permissions once, with background access last', () => {
    expect(permissionsFor('android', 'onboarding')).toEqual([
      'microphone',
      'notifications',
      'full-screen',
      'exact-alarms',
      'background',
    ]);
    expect(permissionsFor('android', 'call')).toEqual(['microphone', 'notifications', 'full-screen', 'background']);
  });

  test('iOS asks only for the microphone and notifications', () => {
    expect(permissionsFor('ios', 'call')).toEqual(['microphone', 'notifications']);
    expect(permissionsFor('ios', 'onboarding')).toEqual(['microphone', 'notifications']);
  });

  test('desktop and the browser show no permission rows', () => {
    expect(permissionsFor('desktop', 'call')).toEqual([]);
    expect(permissionsFor('browser', 'onboarding')).toEqual([]);
  });
});

describe('what the user is shown', () => {
  const states = [
    { id: 'microphone' as const, granted: true },
    { id: 'notifications' as const, granted: false },
    { id: 'background' as const, granted: true },
  ];

  test('onboarding lists every permission but background access only when it is missing', () => {
    expect(visiblePermissions(states, 'onboarding').map(({ id }) => id)).toEqual(['microphone', 'notifications']);
    expect(
      visiblePermissions([{ id: 'background', granted: false }], 'onboarding').map(({ id }) => id),
    ).toEqual(['background']);
  });

  test('a call shows only what is missing', () => {
    expect(visiblePermissions(states, 'call').map(({ id }) => id)).toEqual(['notifications']);
    expect(visiblePermissions([{ id: 'microphone', granted: true }], 'call')).toEqual([]);
  });

  test('only the missing runtime permissions are asked in one go', () => {
    expect(missingRuntime(states)).toEqual(['notifications']);
    expect(missingRuntime([{ id: 'full-screen', granted: false }])).toEqual([]);
  });
});
