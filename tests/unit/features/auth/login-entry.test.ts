import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGIN_QR_ROUTE, loginEntry, loginPollOutcome } from '@/features/auth/model/login-entry';

describe('loginEntry', () => {
  test('native shows the QR display only when the entry asks for it', () => {
    expect(loginEntry({ isNative: true, method: 'qr' })).toBe('qr');
    expect(loginEntry({ isNative: true })).toBe('face');
    expect(loginEntry({ isNative: true, method: 'face' })).toBe('face');
    expect(loginEntry({ isNative: false })).toBe('qr');
    expect(loginEntry({ isNative: false, method: 'qr' })).toBe('qr');
  });

  test('the escape route is the display entry, and the face screen pushes only that', () => {
    const query = LOGIN_QR_ROUTE.split('?')[1] ?? '';
    const method = new URLSearchParams(query).get('method');
    expect(method).not.toBeNull();
    expect(loginEntry({ isNative: true, method: method ?? undefined })).toBe('qr');

    const source = readFileSync(
      join(import.meta.dir, '../../../../src/features/auth/screens/face-screen.tsx'),
      'utf8'
    );
    expect(source).toContain('router.push(LOGIN_QR_ROUTE)');
    expect(source).not.toContain("router.push('/qr')");
    expect(source).not.toContain('.open({ purpose:');
  });

  test('a poll signs in only on an approved status with both tokens', () => {
    expect(loginPollOutcome({ status: 'approved', accessToken: 'a', refreshToken: 'r' })).toBe('approved');
    expect(loginPollOutcome({ status: 'approved', accessToken: 'a' })).toBe('waiting');
    expect(loginPollOutcome({ status: 'approved', accessToken: 'a', refreshToken: null })).toBe('waiting');
    expect(loginPollOutcome({ status: 'approved', refreshToken: 'r' })).toBe('waiting');
    expect(loginPollOutcome({ status: 'expired' })).toBe('expired');
    expect(loginPollOutcome({ status: 'pending' })).toBe('waiting');
  });
});
