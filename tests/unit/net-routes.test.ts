import { describe, expect, test } from 'bun:test';
import { relocatedInstance, serviceUrl } from '@/core/services/net/net-routes';
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
});
