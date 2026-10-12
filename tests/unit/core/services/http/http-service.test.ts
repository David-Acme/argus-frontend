import { beforeEach, describe, expect, mock, test } from 'bun:test';
import type { NetHttpResult, NetPairedInstance } from '@/core/types';

const stale: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.18.205',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: { auth: 7024 },
};

const fresh: NetPairedInstance = { ...stale, routes: { auth: 7042 } };

let current: NetPairedInstance = stale;
let found = true;
let failCode = 'NETWORK_ERROR';
const calls: string[] = [];

const ok = (status: number, info: unknown): NetHttpResult => ({
  status,
  headers: {},
  body: JSON.stringify({ status, info, errors: null }),
});

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => current,
    refreshAddress: async () => {
      if (found) current = fresh;
      return found;
    },
    request: async ({ url }: { url: string }) => {
      calls.push(url);
      if (url.includes(':7024')) throw { code: failCode, message: 'ConnectException' };
      return ok(200, { id: 1 });
    },
  },
}));

mock.module('@/core/services/log', () => ({
  log: { error: () => undefined, warn: () => undefined, info: () => undefined, debug: () => undefined },
}));

const { registerHttpAuth } = await import('@/core/services/http/http-auth');
const { httpService } = await import('@/core/services/http/http.service');

registerHttpAuth({
  credential: () => ({ accessToken: null, version: 1 }),
  refreshSession: async () => 'refreshed',
  clearSession: async () => undefined,
});

describe('the http service on a stale paired address', () => {
  beforeEach(() => {
    current = stale;
    found = true;
    failCode = 'NETWORK_ERROR';
    calls.length = 0;
  });

  test('a refused port is rediscovered and the request retried at the announced one', async () => {
    const response = await httpService.get<{ id: number }>('/auth/login');

    expect(response.ok).toBe(true);
    expect(response.info).toEqual({ id: 1 });
    expect(calls).toEqual([
      'https://argus.local:7024/auth/login',
      'https://argus.local:7042/auth/login',
    ]);
  });

  test('a read timeout reports the failure without redialling the address', async () => {
    failCode = 'TIMEOUT';
    const response = await httpService.get('/auth/login');

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('TIMEOUT');
    expect(calls).toEqual(['https://argus.local:7024/auth/login']);
  });

  test('when discovery finds nothing the failure is reported once, not retried', async () => {
    found = false;
    const response = await httpService.get('/auth/login');

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('NETWORK_ERROR');
    expect(calls).toEqual(['https://argus.local:7024/auth/login']);
  });

  test('a refusal that came from the server never adopts another address', async () => {
    failCode = 'CERT_NOT_TRUSTED';
    const response = await httpService.get('/auth/login');

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('CERT_NOT_TRUSTED');
    expect(calls).toEqual(['https://argus.local:7024/auth/login']);
  });
});
