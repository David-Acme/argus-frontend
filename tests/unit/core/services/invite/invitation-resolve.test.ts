import { describe, expect, test } from 'bun:test';
import {
  invitationResolveRequest,
  validateInvitationResolution,
} from '@/core/services/invite/invitation-resolution';
import type { InvitationQrPayload } from '@/core/types';

const FINGERPRINT = 'F0BB859E8E31C8F51E82788620F8078E09CD4A984767B41EF74E19F85293981D';

const qr: InvitationQrPayload = {
  token: 'tok_0123456789abcdefghijklmnopqrstuv',
  host: 'argus.local',
  ip: '192.168.18.20',
  port: 7044,
  scheme: 'https',
  instanceId: FINGERPRINT,
  caFingerprint: FINGERPRINT,
};

describe('invitationResolveRequest', () => {
  test('the token travels only with the pin the QR carries: its CA fingerprint and its host', () => {
    const { request, pin } = invitationResolveRequest(qr);
    expect(pin).toEqual({ caFingerprint: FINGERPRINT, host: 'argus.local' });
    expect(request.url).toBe('https://192.168.18.20:7044/invitation/resolve');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body ?? '{}')).toEqual({ token: qr.token });
  });
});

const PEM = '-----BEGIN CERTIFICATE-----\nx\n-----END CERTIFICATE-----';

const answer = (patch: Record<string, unknown> = {}) => ({
  role: 'resident',
  expiresAt: 1791835500,
  instanceId: FINGERPRINT,
  caFingerprint: FINGERPRINT,
  serverFingerprint: FINGERPRINT,
  caPem: PEM,
  scheme: 'https',
  port: 7044,
  ...patch,
});

describe('validateInvitationResolution', () => {
  test('carries the name of who invited, trimmed', () => {
    expect(
      validateInvitationResolution(qr, answer({ inviterName: ' Ana Ruiz ' }))?.inviterName
    ).toBe('Ana Ruiz');
  });

  test('an absent, empty or malformed name is unknown, and the invitation still resolves', () => {
    expect(validateInvitationResolution(qr, answer())?.inviterName).toBeNull();
    expect(validateInvitationResolution(qr, answer({ inviterName: '  ' }))?.inviterName).toBeNull();
    expect(validateInvitationResolution(qr, answer({ inviterName: 7 }))?.inviterName).toBeNull();
  });
});
