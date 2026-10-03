import { describe, expect, test } from 'bun:test';
import { readRefreshResponse } from '@/core/services/http/refresh-response';

const body = (info: unknown) => JSON.stringify({ status: 200, info, errors: null });

describe('readRefreshResponse', () => {
  test('401 and 403 end the session', () => {
    expect(readRefreshResponse({ status: 401, body: '' })).toEqual({ outcome: 'rejected' });
    expect(readRefreshResponse({ status: 403, body: '' })).toEqual({ outcome: 'rejected' });
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
