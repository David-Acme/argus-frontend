import { describe, expect, mock, test } from 'bun:test';
import type { NetHttpResult, NetPairedInstance } from '@/core/types';

const paired: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.18.205',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: {},
};

const DROGON_404 =
  '<html>\n<head><title>404 Not Found</title></head>\n<body bgcolor="white" text="black">\n' +
  '<center><h1>404 Not Found</h1></center>\n<hr><center>drogon/1.9.11</center>\n</body>\n</html>';

const htmlNotFound: NetHttpResult = { status: 404, headers: { 'content-type': 'text/html' }, body: DROGON_404 };

const envelopeNotFound: NetHttpResult = {
  status: 404,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ status: 404, info: null, errors: { code: 'NOT_FOUND', message: 'Notification not found' } }),
};

let reply: NetHttpResult = htmlNotFound;

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => paired,
    refreshAddress: async () => false,
    request: async () => reply,
  },
}));

const { registerHttpAuth } = await import('@/core/services/http/http-auth');
const { httpService } = await import('@/core/services/http/http.service');
const { removalSettled, threadRemovalResult } = await import('@/core/services/notification/notification-removal');

registerHttpAuth({
  credential: () => ({ accessToken: null, version: 1 }),
  refreshSession: async () => 'rejected',
  clearSession: async () => undefined,
});

const THREAD = '/notification/thread/guard%3Aepisode%3A41';

describe('a 404 is the NOT_FOUND of the server only inside the Argus envelope', () => {
  test('a server answering an HTML 404 page is an unreachable route', async () => {
    reply = htmlNotFound;
    const response = await httpService.delete(THREAD);
    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('UNREACHABLE_ROUTE');
  });

  test('a server answering the envelope 404 gives its own NOT_FOUND', async () => {
    reply = envelopeNotFound;
    const response = await httpService.delete(THREAD);
    expect(response.ok).toBe(false);
    expect(response.errors).toEqual({ code: 'NOT_FOUND', message: 'Notification not found' });
  });
});

describe('the thread delete draws the same line', () => {
  test('the HTML 404 is a refusal that brings the thread back with the error toast', async () => {
    reply = htmlNotFound;
    const response = await httpService.delete(THREAD);
    expect(removalSettled(response)).toBe(false);
    expect(threadRemovalResult([response])).toEqual({
      status: 404,
      ok: false,
      info: null,
      errors: { code: 'UNREACHABLE_ROUTE', message: 'HTTP 404' },
    });
  });

  test('the envelope 404 is done: no live row of that thread is left on the server', async () => {
    reply = envelopeNotFound;
    const response = await httpService.delete(THREAD);
    expect(removalSettled(response)).toBe(true);
    expect(threadRemovalResult([response]).ok).toBe(true);
  });
});
