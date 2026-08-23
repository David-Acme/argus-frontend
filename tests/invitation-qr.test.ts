import { describe, expect, test } from 'bun:test';
import { buildInvitationQr, parseInvitationQr } from '../src/shared/libs/invitation-qr';

const invitation = {
  token: 'FJqMAQngcmMZy-hZfRzIfZMi0hkspsGfmmM_Mdg28wY',
  host: 'argus.local',
  ip: '192.168.1.24',
  port: 7024,
  scheme: 'https' as const,
  instanceId: 'A'.repeat(64),
  caFingerprint: 'B'.repeat(64),
};

describe('invitation QR', () => {
  test('round-trips the opaque token and pinned server identity', () => {
    expect(parseInvitationQr(buildInvitationQr(invitation))).toEqual(invitation);
  });

  test('rejects a QR that redirects enrollment away from the local Argus host', () => {
    expect(
      parseInvitationQr(
        JSON.stringify({
          v: 1,
          t: 'invite',
          ...invitation,
          host: 'attacker.example',
        }),
      ),
    ).toBeNull();
  });

  test('rejects a non-opaque invitation token', () => {
    expect(
      parseInvitationQr(
        JSON.stringify({
          v: 1,
          t: 'invite',
          ...invitation,
          token: '12345678',
        }),
      ),
    ).toBeNull();
  });
});
