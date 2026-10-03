import { describe, expect, test } from 'bun:test';
import { buildLoginQr, parseLoginQr } from '@/features/auth/model/login-qr';
import { buildInvitationQr, parseInvitationQr } from '@/shared/libs/invitation-qr';
import { hostLabel, isPairingCode, parsePairingQr } from '@/shared/libs/pairing-qr';

const HEX = 'a'.repeat(64);

describe('pairing QR', () => {
  const valid = {
    host: 'argus.local',
    port: 7044,
    scheme: 'https',
    code: 'AB12CD34',
    instanceId: HEX,
    caFingerprint: HEX,
    serverFingerprint: HEX,
  };

  test('a complete payload parses, extras are kept', () => {
    expect(parsePairingQr(JSON.stringify({ ...valid, serviceType: '_argus-route._tcp' }))).toEqual({
      ...valid,
      serviceType: '_argus-route._tcp',
    });
  });

  test('anything off-spec is rejected', () => {
    expect(parsePairingQr('not json')).toBeNull();
    expect(parsePairingQr('[]')).toBeNull();
    expect(parsePairingQr(JSON.stringify({ ...valid, host: 'argus.example.com' }))).toBeNull();
    expect(parsePairingQr(JSON.stringify({ ...valid, port: 70000 }))).toBeNull();
    expect(parsePairingQr(JSON.stringify({ ...valid, scheme: 'http' }))).toBeNull();
    expect(parsePairingQr(JSON.stringify({ ...valid, code: 'xyz' }))).toBeNull();
    expect(parsePairingQr(JSON.stringify({ ...valid, caFingerprint: 'abc' }))).toBeNull();
    const { serverFingerprint: _omitted, ...missing } = valid;
    expect(parsePairingQr(JSON.stringify(missing))).toBeNull();
  });

  test('codes and host labels', () => {
    expect(isPairingCode(' ab12cd34 ')).toBe(true);
    expect(isPairingCode('ab12')).toBe(false);
    expect(hostLabel('argus.local')).toBe('argus');
    expect(hostLabel('10.0.2.2')).toBe('10.0.2.2');
  });
});

describe('invitation QR', () => {
  const payload = {
    token: 'T'.repeat(43),
    host: 'argus.local',
    ip: '192.168.1.20',
    port: 7044,
    scheme: 'https' as const,
    instanceId: HEX,
    caFingerprint: HEX,
  };

  test('build and parse round-trip', () => {
    expect(parseInvitationQr(buildInvitationQr(payload))).toEqual(payload);
  });

  test('version, type, token, address and fingerprints are enforced', () => {
    const qr = JSON.parse(buildInvitationQr(payload)) as Record<string, unknown>;
    expect(parseInvitationQr(JSON.stringify({ ...qr, v: 2 }))).toBeNull();
    expect(parseInvitationQr(JSON.stringify({ ...qr, t: 'login' }))).toBeNull();
    expect(parseInvitationQr(JSON.stringify({ ...qr, token: 'short' }))).toBeNull();
    expect(parseInvitationQr(JSON.stringify({ ...qr, ip: '300.1.1.1' }))).toBeNull();
    expect(parseInvitationQr(JSON.stringify({ ...qr, instanceId: 'nope' }))).toBeNull();
    expect(parseInvitationQr('{')).toBeNull();
  });
});

describe('login QR', () => {
  test('build and parse round-trip', () => {
    expect(parseLoginQr(buildLoginQr(HEX))).toEqual({ id: HEX });
  });

  test('only a 64-hex challenge of the login type parses', () => {
    expect(parseLoginQr(JSON.stringify({ v: 1, t: 'login', id: 'abc' }))).toBeNull();
    expect(parseLoginQr(JSON.stringify({ v: 1, t: 'invite', id: HEX }))).toBeNull();
    expect(parseLoginQr(JSON.stringify({ v: 2, t: 'login', id: HEX }))).toBeNull();
    expect(parseLoginQr('null')).toBeNull();
  });
});
