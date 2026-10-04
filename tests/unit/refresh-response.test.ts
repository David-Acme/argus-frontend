import { describe, expect, test } from 'bun:test';
import { readRefreshResponse, settledRefresh } from '@/core/services/http/refresh-response';

const body = (info: unknown) => JSON.stringify({ status: 200, info, errors: null });

describe('readRefreshResponse', () => {
  test('401 and 403 end the session', () => {
    expect(readRefreshResponse({ status: 401, body: '' })).toEqual({
      outcome: 'rejected',
      accountDisabled: false,
    });
    expect(readRefreshResponse({ status: 403, body: '' })).toEqual({
      outcome: 'rejected',
      accountDisabled: false,
    });
    const disabled = JSON.stringify({
      status: 403,
      info: null,
      errors: { code: 'ACCOUNT_DISABLED', message: 'User account is disabled' },
    });
    expect(readRefreshResponse({ status: 403, body: disabled })).toEqual({
      outcome: 'rejected',
      accountDisabled: true,
    });
  });

  test('throttling, outages and malformed answers keep the session', () => {
    expect(readRefreshResponse({ status: 429, body: '' })).toEqual({ outcome: 'unavailable' });
    expect(readRefreshResponse({ status: 503, body: '' })).toEqual({ outcome: 'unavailable' });
    expect(readRefreshResponse({ status: 200, body: 'not json' })).toEqual({ outcome: 'unavailable' });
    expect(readRefreshResponse({ status: 200, body: body({ refreshToken: 'r' }) })).toEqual({
      outcome: 'unavailable',
    });
    expect(readRefreshResponse({ status: 200, body: body({ accessToken: '' }) })).toEqual({ outcome: 'unavailable' });
  });

  test('a fresh pair is returned, and a missing refresh token is reported as null', () => {
    expect(readRefreshResponse({ status: 200, body: body({ accessToken: 'a', refreshToken: 'r' }) })).toEqual({
      outcome: 'refreshed',
      accessToken: 'a',
      refreshToken: 'r',
    });
    expect(readRefreshResponse({ status: 200, body: body({ accessToken: 'a' }) })).toEqual({
      outcome: 'refreshed',
      accessToken: 'a',
      refreshToken: null,
    });
  });
});

describe('settledRefresh', () => {
  const current = { accessToken: 'T2', version: 4 };

  test('a 401 for a token that was already rotated retries with the current one', () => {
    expect(settledRefresh({ accessToken: 'T1', version: 4 }, current)).toBe('refreshed');
  });

  test('a 401 from a previous session neither refreshes nor clears this one', () => {
    expect(settledRefresh({ accessToken: 'T1', version: 3 }, current)).toBe('unavailable');
  });

  test('a 401 for the current token needs a real refresh', () => {
    expect(settledRefresh({ accessToken: 'T2', version: 4 }, current)).toBeNull();
    expect(settledRefresh(undefined, current)).toBeNull();
    expect(settledRefresh({ accessToken: null, version: 4 }, { accessToken: null, version: 4 })).toBeNull();
  });
});
