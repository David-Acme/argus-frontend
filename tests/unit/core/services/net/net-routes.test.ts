import { describe, expect, test } from 'bun:test';
import { mayRediscover, REDISCOVERY_MEMO_MS, relocatedInstance, serviceUrl, urlAt, urlPath } from '@/core/services/net/net-routes';
import type { NetPairedInstance } from '@/core/types';

const paired: NetPairedInstance = {
  host: 'argus.local',
  ip: '127.0.0.1',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: { pairing: 7044, sync: 7025 },
};

describe('relocatedInstance', () => {
  test('an announcement at the address already paired is not a move', () => {
    expect(relocatedInstance(paired, { ip: '127.0.0.1', port: 7044, routes: [] } as never)).toBeNull();
  });

  test('a new address keeps the paired host and CA and takes the announced ports', () => {
    const candidate = relocatedInstance(paired, {
      ip: '192.168.7.11',
      port: 7044,
      routes: [{ path: '/pairing', port: 9044, https: true }],
    } as never);
    expect(candidate?.ip).toBe('192.168.7.11');
    expect(candidate?.caPem).toBe('pem');
    expect(candidate?.host).toBe('argus.local');
    expect(serviceUrl(candidate!, '/pairing/status')).toBe('https://argus.local:9044/pairing/status');
  });

  test('a stale port at the same address is refreshed from the announcement', () => {
    const stale: NetPairedInstance = { ...paired, routes: { auth: 7024 } };
    const candidate = relocatedInstance(stale, {
      ip: '127.0.0.1',
      port: 7044,
      routes: [{ path: '/auth', port: 7042, https: true }],
    } as never);
    expect(candidate?.ip).toBe('127.0.0.1');
    expect(candidate?.routes).toEqual({ auth: 7042 });
    expect(serviceUrl(candidate!, '/auth/login')).toBe('https://argus.local:7042/auth/login');
  });

  test('an announcement that omits a stored route changes nothing', () => {
    expect(
      relocatedInstance(paired, {
        ip: '127.0.0.1',
        port: 7044,
        routes: [{ path: '/pairing', port: 7044, https: true }],
      } as never)
    ).toBeNull();
  });

  test('a stored route the announcement omits keeps its port through a change', () => {
    const candidate = relocatedInstance(paired, {
      ip: '127.0.0.1',
      port: 7044,
      routes: [{ path: '/pairing', port: 9044, https: true }],
    } as never);
    expect(candidate?.routes).toEqual({ pairing: 9044, sync: 7025 });
  });

  test('a url keeps its scheme, host and path when its port is refreshed', () => {
    const instance: NetPairedInstance = { ...paired, routes: { auth: 7042, sync: 7035 } };
    expect(urlAt('https://argus.local:7024/auth/login', instance)).toBe(
      'https://argus.local:7042/auth/login'
    );
    expect(urlAt('wss://argus.local:7025/sync', instance)).toBe('wss://argus.local:7035/sync');
    expect(urlAt('wss://argus.local:7046/rtc', instance)).toBe('wss://argus.local:7025/rtc');
    expect(urlAt('wss://argus.local:7046/probe', instance)).toBe('wss://argus.local:7046/probe');
  });

  test('a rediscovery that just failed is not repeated inside the window', () => {
    const failedAt = 1_000_000;
    expect(mayRediscover(0, failedAt)).toBe(true);
    expect(mayRediscover(failedAt, failedAt + REDISCOVERY_MEMO_MS - 1)).toBe(false);
    expect(mayRediscover(failedAt, failedAt + REDISCOVERY_MEMO_MS)).toBe(true);
  });

  test('the path of a built url survives the port rewrite', () => {
    expect(urlPath('https://argus.local:7024/auth/login')).toBe('/auth/login');
    expect(urlPath('https://argus.local:7024/calendars?month=10')).toBe('/calendars?month=10');
    expect(urlPath('https://argus.local:7024')).toBe('/');
  });

  test('an announcement with the ports already stored is not a move', () => {
    const candidate = relocatedInstance(paired, {
      ip: '127.0.0.1',
      port: 7044,
      routes: [
        { path: '/pairing', port: 7044, https: true },
        { path: '/sync', port: 7025, https: true },
      ],
    } as never);
    expect(candidate).toBeNull();
  });
});
