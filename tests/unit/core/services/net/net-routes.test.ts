import { describe, expect, test } from 'bun:test';
import { addressUnreachable, mayRediscover, portFor, REDISCOVERY_MEMO_MS, relocatedInstance, serviceUrl, urlAt, urlPath } from '@/core/services/net/net-routes';
import type { NetErrorCode, NetPairedInstance } from '@/core/types';

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

describe('addressUnreachable', () => {
  test('a failure that proves the connection was never established may relocate', () => {
    expect(addressUnreachable('NETWORK_ERROR')).toBe(true);
  });

  test('an answer from the server, a timeout whose phase is not provably the connect, or a local failure never relocates', () => {
    const settled: NetErrorCode[] = [
      'TIMEOUT',
      'CERT_NOT_TRUSTED',
      'UNAUTHORIZED',
      'HOST_NOT_ALLOWED',
      'PAIRING_REQUIRED',
      'FINGERPRINT_MISMATCH',
      'INVALID_PAIRING_CODE',
      'PAIRING_DECLINED',
      'ALREADY_PAIRED',
      'DISCOVERY_NOT_FOUND',
      'STORAGE_ERROR',
    ];
    for (const code of settled) expect(addressUnreachable(code)).toBe(false);
  });
});

describe('a segment the route tables do not own', () => {
  const inherited = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];

  test('falls back to the pairing port, never to a function from the prototype', () => {
    for (const segment of inherited) {
      const port = portFor(paired, `/${segment}`);
      expect([segment, typeof port, port]).toEqual([segment, 'number', paired.port]);
      expect(serviceUrl(paired, `/${segment}/x`)).toBe(`https://argus.local:${paired.port}/${segment}/x`);
    }
  });

  test('a discovered route of that name is still read, because the instance owns it', () => {
    const owned: NetPairedInstance = { ...paired, routes: { ...paired.routes, constructor: 9100 } };
    expect(portFor(owned, '/constructor')).toBe(9100);
  });

  test('the address heal leaves such a url as the caller built it', () => {
    for (const segment of inherited) {
      const url = `https://argus.local:7123/${segment}`;
      expect(urlAt(url, paired)).toBe(url);
    }
  });
});

describe('the relay route', () => {
  const homeId = '0123456789abcdef0123456789abcdef';
  const remote = { homeId, domain: 'argus-tunnel.lynk.page' };

  test('a relay route with a usable remote profile dials the service by its device name', () => {
    const away: NetPairedInstance = { ...paired, remote, route: 'relay' };
    expect(serviceUrl(away, '/pairing/status')).toBe(`https://identity--${homeId}.argus-tunnel.lynk.page/pairing/status`);
    expect(serviceUrl(away, '/sync', 'wss')).toBe(`wss://sync--${homeId}.argus-tunnel.lynk.page/sync`);
    expect(serviceUrl(away, '/rtc/token')).toBe(`https://sync--${homeId}.argus-tunnel.lynk.page/rtc/token`);
    expect(serviceUrl(away, '/notification-token')).toBe(`https://notification--${homeId}.argus-tunnel.lynk.page/notification-token`);
  });

  test('without a usable remote profile, or on the LAN route, the url is the LAN one it always was', () => {
    const lan = 'https://argus.local:7044/pairing/status';
    expect(serviceUrl({ ...paired, route: 'relay' }, '/pairing/status')).toBe(lan);
    expect(serviceUrl({ ...paired, remote, route: 'lan' }, '/pairing/status')).toBe(lan);
    expect(serviceUrl({ ...paired, remote }, '/pairing/status')).toBe(lan);
    expect(serviceUrl({ ...paired, remote: { ...remote, homeId: 'NOT-A-HOME' }, route: 'relay' }, '/pairing/status')).toBe(lan);
    expect(serviceUrl({ ...paired, remote: { ...remote, domain: '' }, route: 'relay' }, '/pairing/status')).toBe(lan);
  });

  test('a segment no home service serves keeps the LAN url on the relay route', () => {
    const away: NetPairedInstance = { ...paired, remote, route: 'relay' };
    expect(serviceUrl(away, '/health')).toBe('https://argus.local:7044/health');
  });

  test('the address heal never rewrites a relay url', () => {
    const away: NetPairedInstance = { ...paired, remote, route: 'relay' };
    const relayed = `https://sync--${homeId}.argus-tunnel.lynk.page/sync`;
    expect(urlAt(relayed, away)).toBe(relayed);
    expect(urlAt(relayed, paired)).toBe(relayed);
    expect(urlAt('https://argus.local:9999/pairing/status', away)).toBe('https://argus.local:7044/pairing/status');
  });
});
