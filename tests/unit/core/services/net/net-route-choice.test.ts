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
  const failures: NetProbeOutcome[] = ['dns', 'connect', 'tls-peer-closed', 'pin', 'absent'];
  const everything: NetProbeOutcome[] = ['reached', ...failures];
  const lanMisses: NetProbeOutcome[] = ['dns', 'connect', 'tls-peer-closed', 'absent'];

  test('the LAN wins whenever it answers', () => {
    for (const relay of everything) {
      expect(chooseRoute({ lan: 'reached', relay })).toEqual({ mode: 'lan', status: 'home', relayRefused: false });
    }
  });

  test('the relay is used only when the LAN does not answer and the relay does', () => {
    for (const lan of failures) {
      expect(chooseRoute({ lan, relay: 'reached' })).toEqual({ mode: 'relay', status: 'cloud', relayRefused: false });
    }
  });

  test('a relay that fails at the cloud, or no relay at all, means remote access is unavailable', () => {
    for (const lan of lanMisses) {
      for (const relay of ['dns', 'connect', 'absent'] as const) {
        expect(chooseRoute({ lan, relay })).toEqual({ mode: 'lan', status: 'remote-unavailable', relayRefused: false });
      }
    }
  });

  test('a relay that reached the cloud but not the home means the home is unreachable', () => {
    for (const lan of lanMisses) {
      expect(chooseRoute({ lan, relay: 'tls-peer-closed' })).toEqual({
        mode: 'lan',
        status: 'unreachable',
        relayRefused: false,
      });
    }
  });

  test('a relay that fails the pin is no calm state, but a refusal to raise', () => {
    for (const lan of lanMisses) {
      expect(chooseRoute({ lan, relay: 'pin' })).toEqual({ mode: 'lan', status: null, relayRefused: true });
    }
    expect(chooseRoute({ lan: 'pin', relay: 'pin' })).toEqual({ mode: null, status: null, relayRefused: true });
  });

  test('a LAN that fails the pin is set aside: the relay when there is a profile, no route when there is none', () => {
    expect(chooseRoute({ lan: 'pin', relay: 'connect' })).toEqual({
      mode: 'relay',
      status: 'remote-unavailable',
      relayRefused: false,
    });
    expect(chooseRoute({ lan: 'pin', relay: 'tls-peer-closed' })).toEqual({
      mode: 'relay',
      status: 'unreachable',
      relayRefused: false,
    });
    expect(chooseRoute({ lan: 'pin', relay: 'absent' })).toEqual({
      mode: null,
      status: 'remote-unavailable',
      relayRefused: false,
    });
  });
});
