import { describe, expect, test } from 'bun:test';
import { validateInvitationResolution } from '../src/core/services/invitation-resolution';

const qr = {
  token: 'FJqMAQngcmMZy-hZfRzIfZMi0hkspsGfmmM_Mdg28wY',
  host: 'argus.local',
  ip: '192.168.1.24',
  port: 7024,
  scheme: 'https' as const,
  instanceId: 'A'.repeat(64),
  caFingerprint: 'B'.repeat(64),
};

const resolved = {
  role: 'guard' as const,
  expiresAt: 1_800_000_000,
  instanceId: 'a'.repeat(64),
  caFingerprint: 'b'.repeat(64),
  serverFingerprint: 'C'.repeat(64),
  caPem: '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----',
  scheme: 'https' as const,
  port: 7024,
};

describe('validateInvitationResolution', () => {
  test('accepts a certificate response that matches the QR-pinned identity', () => {
    expect(validateInvitationResolution(qr, resolved)).toEqual(resolved);
  });

  test('rejects a response that tries to replace the QR-pinned CA', () => {
    expect(
      validateInvitationResolution(qr, { ...resolved, caFingerprint: 'D'.repeat(64) }),
    ).toBeNull();
  });

  test('rejects an owner role from an invitation response', () => {
    expect(validateInvitationResolution(qr, { ...resolved, role: 'owner' })).toBeNull();
  });
});
