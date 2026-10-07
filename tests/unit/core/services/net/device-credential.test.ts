import { afterEach, describe, expect, test } from 'bun:test';
import {
  cleanDeviceCredential,
  deviceCredential,
  DEVICE_CREDENTIAL_HEADER,
  setDeviceCredential,
  withDeviceCredential,
} from '@/core/services/net/device-credential';

afterEach(() => setDeviceCredential(null));

describe('device credential', () => {
  test('a credential is kept only when it is printable ASCII within the size limit', () => {
    expect(cleanDeviceCredential(' a1b2-c3 ')).toBe('a1b2-c3');
    expect(cleanDeviceCredential('')).toBeNull();
    expect(cleanDeviceCredential(null)).toBeNull();
    expect(cleanDeviceCredential(undefined)).toBeNull();
    expect(cleanDeviceCredential('with space')).toBeNull();
    expect(cleanDeviceCredential('line\nbreak')).toBeNull();
    expect(cleanDeviceCredential('ñ')).toBeNull();
    expect(cleanDeviceCredential('x'.repeat(256))).toBe('x'.repeat(256));
    expect(cleanDeviceCredential('x'.repeat(257))).toBeNull();
  });

  test('every request carries the credential of the current session', () => {
    setDeviceCredential('secret-1');
    expect(deviceCredential()).toBe('secret-1');
    expect(withDeviceCredential({ Authorization: 'Bearer a' })).toEqual({
      Authorization: 'Bearer a',
      [DEVICE_CREDENTIAL_HEADER]: 'secret-1',
    });
  });

  test('a caller cannot override or smuggle the header in another case', () => {
    setDeviceCredential('secret-1');
    expect(withDeviceCredential({ 'x-argus-device-credential': 'forged' })).toEqual({
      [DEVICE_CREDENTIAL_HEADER]: 'secret-1',
    });
  });

  test('without a session no credential is sent, and a stale one is stripped', () => {
    expect(withDeviceCredential(undefined)).toEqual({});
    setDeviceCredential('secret-1');
    setDeviceCredential(null);
    expect(deviceCredential()).toBeNull();
    expect(withDeviceCredential({ 'X-Argus-Device-Credential': 'old', Accept: 'application/json' })).toEqual({
      Accept: 'application/json',
    });
  });

  test('a new login replaces the previous credential', () => {
    setDeviceCredential('first');
    setDeviceCredential('second');
    expect(withDeviceCredential({})[DEVICE_CREDENTIAL_HEADER]).toBe('second');
  });
});
