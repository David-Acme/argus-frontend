import { describe, expect, test } from 'bun:test';
import { invitationResolveRequest } from '@/core/services/invite/invitation-resolution';
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
