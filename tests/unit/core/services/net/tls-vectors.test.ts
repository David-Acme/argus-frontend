import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deviceName, usableRemote } from '@/core/services/net/net-route-choice';

interface TlsIdentityVector {
  cert: string;
  key: string;
}

interface TlsVectors {
  lanHost: string;
  homeId: string;
  domain: string;
  relayHost: string;
  ca: string;
  home: TlsIdentityVector;
  rogue: TlsIdentityVector;
  misnamed: TlsIdentityVector;
}

const vectors = JSON.parse(
  readFileSync(join(import.meta.dir, '../../../../vectors/tls.json'), 'utf8')
) as TlsVectors;
const remote = { homeId: vectors.homeId, domain: vectors.domain };

describe('the TLS vectors every transport reads', () => {
  test('the relay host is the identity service of this home under the relay domain', () => {
    expect(usableRemote(remote)).toBe(true);
    expect(vectors.relayHost).toBe(deviceName('identity', remote));
  });

  test('the LAN host is a name the home does not own on the relay domain', () => {
    expect(vectors.lanHost.endsWith(`.${vectors.domain}`)).toBe(false);
  });

  test('the CA and every identity are PEM blocks', () => {
    expect(vectors.ca.startsWith('-----BEGIN CERTIFICATE-----')).toBe(true);
    for (const identity of [vectors.home, vectors.rogue, vectors.misnamed]) {
      expect(identity.cert.startsWith('-----BEGIN CERTIFICATE-----')).toBe(true);
      expect(identity.key.startsWith('-----BEGIN PRIVATE KEY-----')).toBe(true);
    }
  });
});
