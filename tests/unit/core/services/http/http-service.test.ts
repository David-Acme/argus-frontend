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

const HOME = '0123456789abcdef0123456789abcdef';
const away: NetPairedInstance = {
  ...stale,
  remote: { homeId: HOME, domain: 'argus-tunnel.lynk.page' },
  route: 'relay',
};

const staleReminder: NetPairedInstance = { ...stale, routes: { reminder: 7024 } };
const freshReminder: NetPairedInstance = { ...fresh, routes: { reminder: 7027 } };

let current: NetPairedInstance = stale;
let refreshed: NetPairedInstance = fresh;
let found = true;
let failCode = 'NETWORK_ERROR';
let serverRefusal: NetHttpResult | null = null;
const calls: string[] = [];

const ok = (status: number, info: unknown): NetHttpResult => ({
  status,
  headers: {},
  body: JSON.stringify({ status, info, errors: null }),
});

const refused = (status: number, code: string, message: string): NetHttpResult => ({
  status,
  headers: {},
  body: JSON.stringify({ status, info: null, errors: { code, message } }),
});

mock.module('@/core/services/net', () => ({
  netService: {
    instance: async () => current,
    refreshAddress: async () => {
      if (found) current = refreshed;
      return found;
    },
    request: async ({ url }: { url: string }) => {
      calls.push(url);
      if (url.includes(':7024')) throw { code: failCode, message: 'ConnectException' };
      if (serverRefusal) return serverRefusal;
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
    refreshed = fresh;
    found = true;
    failCode = 'NETWORK_ERROR';
    serverRefusal = null;
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

  test('a failed connect that moved the route to the relay is retried at the device name', async () => {
    refreshed = away;
    const response = await httpService.get<{ id: number }>('/auth/login');

    expect(response.ok).toBe(true);
    expect(calls).toEqual([
      'https://argus.local:7024/auth/login',
      `https://auth--${HOME}.argus-tunnel.lynk.page/auth/login`,
    ]);
  });

  test('a refusal that came from the server never adopts another address', async () => {
    failCode = 'CERT_NOT_TRUSTED';
    const response = await httpService.get('/auth/login');

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('CERT_NOT_TRUSTED');
    expect(calls).toEqual(['https://argus.local:7024/auth/login']);
  });
});

describe('a change the server never received', () => {
  beforeEach(() => {
    current = staleReminder;
    refreshed = freshReminder;
    found = false;
    failCode = 'NETWORK_ERROR';
    serverRefusal = null;
    calls.length = 0;
  });

  test('a write that never reached the server is refused as unsent', async () => {
    const response = await httpService.post('/reminder/3/snooze', { minutes: 10 });

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('WRITE_NOT_SENT');
    expect(calls).toEqual(['https://argus.local:7024/reminder/3/snooze']);
  });

  test('a write whose answer was lost is refused as unconfirmed', async () => {
    failCode = 'TIMEOUT';
    const response = await httpService.patch('/reminder/3', { title: 'Riego' });

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('WRITE_UNCONFIRMED');
  });

  test('a read keeps the network failure its cached view and the offline notice explain', async () => {
    const response = await httpService.get('/reminder');

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('NETWORK_ERROR');
  });

  test('the face login upload keeps the network failure its own screen explains', async () => {
    current = stale;
    const response = await httpService.postMultipart('/auth/login', {
      name: 'image',
      uri: 'file:///face.jpg',
      filename: 'face.jpg',
      contentType: 'image/jpeg',
    });

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('NETWORK_ERROR');
  });

  test('a write the server answered keeps the refusal the server sent', async () => {
    found = true;
    serverRefusal = refused(403, 'MODULE_DISABLED', 'That part of Argus is off');
    const response = await httpService.delete('/reminder/3');

    expect(response.ok).toBe(false);
    expect(response.errors?.code).toBe('MODULE_DISABLED');
    expect(calls).toEqual(['https://argus.local:7024/reminder/3', 'https://argus.local:7027/reminder/3']);
  });
});
