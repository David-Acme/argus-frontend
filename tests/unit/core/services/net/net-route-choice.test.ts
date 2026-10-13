import { describe, expect, test } from 'bun:test';
import {
  chooseRoute,
  deviceName,
  isHomeId,
  isRelayHost,
  relayAuthority,
  serviceOfSegment,
  usableRemote,
} from '@/core/services/net/net-route-choice';
import {
  ARGUS_DEFAULT_ROUTE_PORTS,
  ARGUS_HOME_SERVICES,
  ARGUS_RELAY_DOMAIN,
  ARGUS_ROUTE_SERVICES,
  ARGUS_SERVICE_DEFAULT_PORTS,
} from '@/shared/constants';
import type { NetProbeOutcome } from '@/core/types';

const homeId = '0123456789abcdef0123456789abcdef';
const remote = { homeId, domain: ARGUS_RELAY_DOMAIN };

describe('home ids and remote profiles', () => {
  test('a home id is 32 lowercase hexadecimal characters', () => {
    expect(isHomeId(homeId)).toBe(true);
    expect(isHomeId(homeId.toUpperCase())).toBe(false);
    expect(isHomeId(homeId.slice(1))).toBe(false);
    expect(isHomeId(`${homeId}0`)).toBe(false);
    expect(isHomeId('g123456789abcdef0123456789abcdef')).toBe(false);
    expect(isHomeId('')).toBe(false);
  });

  test('a remote profile is usable only with a home id and a domain name', () => {
    expect(usableRemote(remote)).toBe(true);
    expect(usableRemote(undefined)).toBe(false);
    expect(usableRemote({ ...remote, homeId: 'nope' })).toBe(false);
    expect(usableRemote({ ...remote, domain: '' })).toBe(false);
    expect(usableRemote({ ...remote, domain: 'localhost' })).toBe(false);
    expect(usableRemote({ ...remote, domain: 'argus tunnel.lynk.page' })).toBe(false);
    expect(usableRemote({ ...remote, domain: 'argus-tunnel.lynk.page.' })).toBe(false);
  });
});

describe('device names', () => {
  test('each route segment names the home service that serves it', () => {
    expect(serviceOfSegment('auth')).toBe('auth');
    expect(serviceOfSegment('pairing')).toBe('identity');
    expect(serviceOfSegment('rtc')).toBe('sync');
    expect(serviceOfSegment('modules')).toBe('settings');
    expect(serviceOfSegment('health')).toBeNull();
    expect(serviceOfSegment('')).toBeNull();
    for (const inherited of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(serviceOfSegment(inherited)).toBeNull();
    }
  });

  test('a device name is <service>--<home-id> under the relay domain', () => {
    expect(deviceName('settings', remote)).toBe(`settings--${homeId}.argus-tunnel.lynk.page`);
    expect(relayAuthority(remote, 'guard')).toBe(`guard--${homeId}.argus-tunnel.lynk.page`);
    expect(relayAuthority(remote, 'health')).toBeNull();
    expect(relayAuthority(undefined, 'guard')).toBeNull();
    expect(relayAuthority({ ...remote, homeId: homeId.toUpperCase() }, 'guard')).toBeNull();
  });

  test('every home service spells a valid service label, and every device name label fits DNS', () => {
    for (const service of ARGUS_HOME_SERVICES) {
      expect(service).toMatch(/^[a-z][a-z0-9]{2,11}$/);
      expect(`${service}--${homeId}`.length).toBeLessThanOrEqual(63);
    }
  });

  test('a relay host is a name under the relay domain, compared case-insensitively', () => {
    expect(isRelayHost(`sync--${homeId}.argus-tunnel.lynk.page`, ARGUS_RELAY_DOMAIN)).toBe(true);
    expect(isRelayHost(`SYNC--${homeId}.Argus-Tunnel.Lynk.Page`, ARGUS_RELAY_DOMAIN)).toBe(true);
    expect(isRelayHost('argus-tunnel.lynk.page', ARGUS_RELAY_DOMAIN)).toBe(false);
    expect(isRelayHost('evilargus-tunnel.lynk.page', ARGUS_RELAY_DOMAIN)).toBe(false);
    expect(isRelayHost('sync.argus-tunnel.lynk.page.example.com', ARGUS_RELAY_DOMAIN)).toBe(false);
    expect(isRelayHost('argus.local', ARGUS_RELAY_DOMAIN)).toBe(false);
  });
});

describe('the route tables agree', () => {
  test('every route with a default port names a home service, and no other route does', () => {
    expect(Object.keys(ARGUS_ROUTE_SERVICES).sort()).toEqual(Object.keys(ARGUS_DEFAULT_ROUTE_PORTS).sort());
  });

  test("a route's default port is its service's port", () => {
    for (const [segment, service] of Object.entries(ARGUS_ROUTE_SERVICES)) {
      expect([segment, ARGUS_DEFAULT_ROUTE_PORTS[segment]]).toEqual([segment, ARGUS_SERVICE_DEFAULT_PORTS[service]]);
    }
  });

  test('the closed set is the eight services the home client dispatches, each with its own port', () => {
    expect(Object.keys(ARGUS_SERVICE_DEFAULT_PORTS).sort()).toEqual([...ARGUS_HOME_SERVICES].sort());
    expect(new Set(ARGUS_HOME_SERVICES).size).toBe(8);
    expect(new Set(Object.values(ARGUS_SERVICE_DEFAULT_PORTS)).size).toBe(8);
    expect(new Set(Object.values(ARGUS_ROUTE_SERVICES))).toEqual(new Set(ARGUS_HOME_SERVICES));
  });
});

describe('the route choice', () => {
  const outcomes: NetProbeOutcome[] = ['reached', 'failed', 'absent'];

  test('the LAN wins whenever it answers', () => {
    for (const relay of outcomes) {
      expect(chooseRoute({ lan: 'reached', relay })).toEqual({ mode: 'lan', status: 'home' });
    }
  });

  test('the relay is used only when the LAN does not answer and the relay does', () => {
    expect(chooseRoute({ lan: 'failed', relay: 'reached' })).toEqual({ mode: 'relay', status: 'cloud' });
    expect(chooseRoute({ lan: 'absent', relay: 'reached' })).toEqual({ mode: 'relay', status: 'cloud' });
  });

  test('when neither answers the home is unreachable and the LAN stays the route to retry', () => {
    for (const lan of ['failed', 'absent'] as const) {
      for (const relay of ['failed', 'absent'] as const) {
        expect(chooseRoute({ lan, relay })).toEqual({ mode: 'lan', status: 'unreachable' });
      }
    }
  });
});
