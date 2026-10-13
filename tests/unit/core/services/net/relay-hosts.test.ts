import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { admittedRelayHost, deviceName, usableRemote } from '@/core/services/net/net-route-choice';
import { ARGUS_HOME_SERVICES } from '@/shared/constants';

interface RemoteProfileVector {
  homeId: string;
  domain: string;
}

interface RelayHostVectors {
  homeId: string;
  domain: string;
  admitted: string[];
  refused: string[];
  usableProfiles: RemoteProfileVector[];
  unusableProfiles: RemoteProfileVector[];
}

function namesOf(profile: RemoteProfileVector): string[] {
  return ARGUS_HOME_SERVICES.map((service) => `${service}--${profile.homeId}.${profile.domain}`);
}

const vectors = JSON.parse(
  readFileSync(join(import.meta.dir, '../../../../vectors/relay-hosts.json'), 'utf8')
) as RelayHostVectors;
const remote = { homeId: vectors.homeId, domain: vectors.domain };

describe('the relay hosts every transport admits', () => {
  test('each admitted vector is one of this home\'s eight device names', () => {
    expect(vectors.admitted.length).toBe(ARGUS_HOME_SERVICES.length);
    for (const host of vectors.admitted) {
      expect([host, admittedRelayHost(host, remote)]).toEqual([host, true]);
    }
    expect([...vectors.admitted].sort()).toEqual(ARGUS_HOME_SERVICES.map((service) => deviceName(service, remote)).sort());
  });

  test('each refused vector is refused', () => {
    expect(vectors.refused.length).toBeGreaterThanOrEqual(30);
    for (const host of vectors.refused) {
      expect([host, admittedRelayHost(host, remote)]).toEqual([host, false]);
    }
  });

  test('nothing is admitted without a usable remote profile', () => {
    for (const host of vectors.admitted) {
      expect(admittedRelayHost(host, undefined)).toBe(false);
      expect(admittedRelayHost(host, { ...remote, homeId: vectors.homeId.toUpperCase() })).toBe(false);
      expect(admittedRelayHost(host, { ...remote, domain: '' })).toBe(false);
    }
  });

  test('a usable profile admits each of its eight device names', () => {
    expect(vectors.usableProfiles.length).toBeGreaterThanOrEqual(5);
    for (const profile of vectors.usableProfiles) {
      expect([profile, usableRemote(profile)]).toEqual([profile, true]);
      for (const host of namesOf(profile)) {
        expect([host, admittedRelayHost(host, profile)]).toEqual([host, true]);
      }
    }
  });

  test('an unusable profile admits nothing, not even its own names', () => {
    expect(vectors.unusableProfiles.length).toBeGreaterThanOrEqual(20);
    for (const profile of vectors.unusableProfiles) {
      expect([profile, usableRemote(profile)]).toEqual([profile, false]);
      for (const host of namesOf(profile)) {
        expect([host, admittedRelayHost(host, profile)]).toEqual([host, false]);
      }
    }
  });
});
