import { describe, expect, test } from 'bun:test';
import { permissionsFor } from '@/shared/libs/device-permissions';

describe('the device permissions each platform asks for', () => {
  test('Android asks for the call permissions and onboarding adds the exact alarms', () => {
    expect(permissionsFor('android', 'call')).toEqual(['microphone', 'notifications', 'full-screen']);
    expect(permissionsFor('android', 'onboarding')).toEqual(['notifications', 'full-screen', 'exact-alarms']);
  });

  test('iOS has no full-screen or exact-alarm permission', () => {
    expect(permissionsFor('ios', 'call')).toEqual(['microphone', 'notifications']);
    expect(permissionsFor('ios', 'onboarding')).toEqual(['notifications']);
  });

  test('desktop and the browser show no permission rows', () => {
    expect(permissionsFor('desktop', 'call')).toEqual([]);
    expect(permissionsFor('browser', 'onboarding')).toEqual([]);
  });
});
