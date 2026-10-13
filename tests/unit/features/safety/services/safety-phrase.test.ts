import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { NetHttpRequest, NetHttpResult, NetPairedInstance } from '@/core/types';

type Sent = { method: string; path: string; body: unknown };

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

const envelope = (status: number, info: unknown, errors: unknown = null): NetHttpResult => ({
  status,
  headers: {},
  body: JSON.stringify({ status, info, errors }),
});

const sent: Sent[] = [];
let reply: NetHttpResult = envelope(200, null);

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => paired,
    refreshAddress: async () => false,
    request: async ({ url, method, body }: NetHttpRequest) => {
      sent.push({ method, path: new URL(url).pathname, body: body === undefined ? undefined : JSON.parse(body) });
      return reply;
    },
  },
}));

const { registerHttpAuth } = await import('@/core/services/http/http-auth');
const { safetyService } = await import('@/features/safety/services/safety.service');

registerHttpAuth({
  credential: () => ({ accessToken: null, version: 1 }),
  refreshSession: async () => 'rejected',
  clearSession: async () => undefined,
});

const phrase = 'la lluvia de abril trae flores';

describe('setting the duress phrase', () => {
  beforeEach(() => {
    sent.length = 0;
    safetyService.forget();
  });

  test('the phrase travels once to the server and the answer it keeps holds no trace of it', async () => {
    reply = envelope(200, {
      duressEnabled: true,
      hasPin: true,
      hasPhrase: true,
      alertsReach: 'others',
      duressPhrase: phrase,
    });
    const result = await safetyService.setPhrase(phrase, '4821');
    expect(sent).toEqual([
      {
        method: 'PATCH',
        path: '/guard/safety',
        body: { duressEnabled: true, duressPhrase: phrase, currentPin: '4821' },
      },
    ]);
    expect(result.info).toEqual({ duressEnabled: true, hasPin: true, hasPhrase: true });
    expect(JSON.stringify(result)).not.toContain(phrase);
    expect(JSON.stringify(safetyService)).not.toContain(phrase);
  });

  test('clearing sends null, and without a code of their own the owner sends none', async () => {
    reply = envelope(200, { duressEnabled: true, hasPin: false, hasPhrase: false, alertsReach: 'nobody' });
    const result = await safetyService.setPhrase(null);
    expect(sent).toEqual([
      { method: 'PATCH', path: '/guard/safety', body: { duressEnabled: true, duressPhrase: null } },
    ]);
    expect(result.info?.hasPhrase).toBe(false);
  });

  test('a refused phrase leaves nothing behind either', async () => {
    reply = envelope(422, null, {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      fields: [{ field: 'duressPhrase', message: 'duressPhrase must be 3 to 12 words without digits' }],
    });
    const result = await safetyService.setPhrase(phrase, '4821');
    expect(result.ok).toBe(false);
    expect(result.errors?.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(result)).not.toContain(phrase);
    expect(JSON.stringify(safetyService)).not.toContain(phrase);
  });
});
