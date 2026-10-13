import { describe, expect, mock, test } from 'bun:test';
import type { NetPairedInstance } from '@/core/types';

mock.module('@/core/services/secure-storage', () => ({
  secureStorageService: {
    getStringAsync: async () => null,
    setStringAsync: async () => undefined,
    deleteAsync: async () => undefined,
    hasAsync: async () => false,
  },
}));

const { measureRoute, probeUrls } = await import('@/core/services/net/net-route-probe');

const HOME = '0123456789abcdef0123456789abcdef';
const DOMAIN = 'argus-tunnel.lynk.page';
const LAN = 'https://argus.local:7044/pairing/status';
const RELAY = `https://identity--${HOME}.${DOMAIN}/pairing/status`;

const instance: NetPairedInstance = {
  host: 'argus.local',
  ip: '192.168.1.20',
  port: 7044,
  caPem: 'pem',
  caFingerprint: 'fingerprint',
  instanceId: 'instance',
  pairedAt: 1,
  routes: { pairing: 7044 },
  remote: { homeId: HOME, domain: DOMAIN },
};

const { remote: _remote, ...withoutRemote } = instance;

const refused = (): Promise<never> => Promise.reject(new Error('NETWORK_ERROR|unreachable'));
const silent = (): Promise<never> => new Promise<never>(() => undefined);

describe('the route probe', () => {
  test('asks the paired host on the LAN and the identity service by its device name', () => {
    expect(probeUrls(instance)).toEqual({ lan: LAN, relay: RELAY });
    expect(probeUrls({ ...instance, route: 'relay' })).toEqual({ lan: LAN, relay: RELAY });
    expect(probeUrls(withoutRemote)).toEqual({ lan: LAN, relay: null });
    expect(probeUrls({ ...instance, remote: { homeId: HOME.toUpperCase(), domain: DOMAIN } }).relay).toBeNull();
  });

  test('the LAN wins as soon as it answers, without waiting for the relay', async () => {
    let relayAnswered = false;
    const choice = await measureRoute(
      instance,
      (url) =>
        url === LAN
          ? Promise.resolve()
          : new Promise((resolve) =>
              setTimeout(() => {
                relayAnswered = true;
                resolve(undefined);
              }, 200)
            ),
      60_000
    );
    expect(choice).toEqual({ mode: 'lan', status: 'home' });
    expect(relayAnswered).toBe(false);
  });

  test('the relay is chosen only when the LAN does not answer and the relay does', async () => {
    const choice = await measureRoute(instance, (url) => (url === RELAY ? Promise.resolve() : refused()), 50);
    expect(choice).toEqual({ mode: 'relay', status: 'cloud' });
  });

  test('a home that answers neither way is unreachable, and the LAN stays the route', async () => {
    expect(await measureRoute(instance, refused, 50)).toEqual({ mode: 'lan', status: 'unreachable' });
  });

  test('without a usable profile only the LAN is asked', async () => {
    const asked: string[] = [];
    const choice = await measureRoute(
      withoutRemote,
      (url) => {
        asked.push(url);
        return refused();
      },
      50
    );
    expect(asked).toEqual([LAN]);
    expect(choice).toEqual({ mode: 'lan', status: 'unreachable' });
  });

  test('an answer that never comes counts as a failure once the probe times out', async () => {
    const started = Date.now();
    const choice = await measureRoute(instance, (url) => (url === RELAY ? Promise.resolve() : silent()), 30);
    expect(choice).toEqual({ mode: 'relay', status: 'cloud' });
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
