import { describe, expect, test } from 'bun:test';
import { deepLinkPath } from '@/app/+native-intent';

describe('the desktop links end on the screens the Android links end on', () => {
  test('the answered call link the desktop emits lands on the call route, as argus://call does on Android', () => {
    expect(deepLinkPath('argus://call?callId=call-7')).toBe('/call?callId=call-7');
  });

  test('the notification link the desktop emits lands on the notification route, as argus://notification does on Android', () => {
    expect(deepLinkPath('argus://notification?notificationId=42')).toBe('/notification?notificationId=42');
  });
});
