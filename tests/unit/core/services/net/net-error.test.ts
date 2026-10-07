import { describe, expect, mock, test } from 'bun:test';

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async () => null,
    setStringAsync: async () => undefined,
    deleteAsync: async () => undefined,
    hasAsync: async () => false,
  },
}));

const { toNetError } = await import('@/core/services/net/net-persistence');

describe('toNetError', () => {
  test('a CODE|message native error keeps its code and message', () => {
    expect(toNetError(new Error('FINGERPRINT_MISMATCH|Server proof does not match'), 'NETWORK_ERROR')).toEqual({
      code: 'FINGERPRINT_MISMATCH',
      message: 'Server proof does not match',
    });
    expect(toNetError('CERT_NOT_TRUSTED|a|b', 'NETWORK_ERROR')).toEqual({ code: 'CERT_NOT_TRUSTED', message: 'a|b' });
    expect(toNetError('TIMEOUT|operation timed out', 'NETWORK_ERROR')).toEqual({
      code: 'TIMEOUT',
      message: 'operation timed out',
    });
    expect(toNetError('HOST_NOT_ALLOWED', 'NETWORK_ERROR')).toEqual({
      code: 'HOST_NOT_ALLOWED',
      message: 'HOST_NOT_ALLOWED',
    });
  });

  test('free-form messages are classified by keyword', () => {
    expect(toNetError(new Error('bad certificate chain'), 'NETWORK_ERROR').code).toBe('CERT_NOT_TRUSTED');
    expect(toNetError('websocket unauthorized', 'NETWORK_ERROR').code).toBe('UNAUTHORIZED');
    expect(toNetError('error sending request for /camera/401/stream', 'NETWORK_ERROR').code).toBe('NETWORK_ERROR');
    expect(toNetError('keyring storage locked', 'NETWORK_ERROR').code).toBe('STORAGE_ERROR');
  });

  test('an unknown failure takes the caller fallback and keeps the raw text', () => {
    expect(toNetError(new Error('socket hang up'), 'DISCOVERY_NOT_FOUND')).toEqual({
      code: 'DISCOVERY_NOT_FOUND',
      message: 'socket hang up',
    });
  });
});
