import { describe, expect, test } from 'bun:test';
import {
  cleanAppVersion,
  cleanDeviceName,
  clientIdentityHeaders,
  withClientIdentity,
} from '@/core/services/net/client-identity';

describe('clientIdentityHeaders', () => {
  test('the user agent is stable per platform and the version travels in its own header', () => {
    expect(
      clientIdentityHeaders({ platform: 'android', appVersion: '1.4.0', deviceName: 'Pixel 8' })
    ).toEqual({
      'User-Agent': 'Argus/1 (android)',
      'X-Argus-Client': 'android/1.4.0',
      'X-Argus-Device': 'Pixel%208',
    });
    expect(
      clientIdentityHeaders({ platform: 'ios', appVersion: '2.0.0', deviceName: null })
    ).toEqual({
      'User-Agent': 'Argus/1 (ios)',
      'X-Argus-Client': 'ios/2.0.0',
    });
  });

  test('the device name is percent-encoded UTF-8, like encodeURIComponent', () => {
    const headers = clientIdentityHeaders({
      platform: 'ios',
      appVersion: '1.0.0',
      deviceName: 'iPhone de Ñandú',
    });
    expect(headers['X-Argus-Device']).toBe('iPhone%20de%20%C3%91and%C3%BA');
    expect(decodeURIComponent(headers['X-Argus-Device'] ?? '')).toBe('iPhone de Ñandú');
  });

  test('a version that is not a version is sent as 0', () => {
    expect(cleanAppVersion('1.4.0')).toBe('1.4.0');
    expect(cleanAppVersion(' 1.4.0-beta+7 ')).toBe('1.4.0-beta+7');
    expect(cleanAppVersion('1.0 (build 3)')).toBe('0');
    expect(cleanAppVersion(undefined)).toBe('0');
  });
});

describe('cleanDeviceName', () => {
  test('control characters and runs of whitespace collapse, and the name is capped at 64 characters', () => {
    expect(cleanDeviceName('  Salón\n\tTV  ')).toBe('Salón TV');
    expect(cleanDeviceName('\u0000\u0007')).toBeNull();
    expect(cleanDeviceName('')).toBeNull();
    expect(Array.from(cleanDeviceName('📱'.repeat(80)) ?? '')).toHaveLength(64);
  });
});

describe('withClientIdentity', () => {
  test('identity headers win over any spelling a caller passes', () => {
    const identity = clientIdentityHeaders({
      platform: 'android',
      appVersion: '1.0.0',
      deviceName: 'A',
    });
    expect(
      withClientIdentity(
        { 'user-agent': 'okhttp/4.12', Authorization: 'Bearer t', 'x-argus-device': 'B' },
        identity
      )
    ).toEqual({ Authorization: 'Bearer t', ...identity });
    expect(withClientIdentity(undefined, identity)).toEqual(identity);
  });
});
