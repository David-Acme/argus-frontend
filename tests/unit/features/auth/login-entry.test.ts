import { describe, expect, test } from 'bun:test';
import {
  LOGIN_QR_ROUTE,
  loginEntry,
  loginPollOutcome,
  pollAnswerOutcome,
  settledPhaseOf,
} from '@/features/auth/model/login-entry';

describe('loginEntry', () => {
  test('native shows the QR display only when the entry asks for it', () => {
    expect(loginEntry({ isNative: true, method: 'qr' })).toBe('qr');
    expect(loginEntry({ isNative: true })).toBe('face');
    expect(loginEntry({ isNative: true, method: 'face' })).toBe('face');
    expect(loginEntry({ isNative: false })).toBe('qr');
    expect(loginEntry({ isNative: false, method: 'qr' })).toBe('qr');
  });

  test('the escape route is the display entry', () => {
    const query = LOGIN_QR_ROUTE.split('?')[1] ?? '';
    const method = new URLSearchParams(query).get('method');
    expect(method).not.toBeNull();
    expect(loginEntry({ isNative: true, method: method ?? undefined })).toBe('qr');
  });

  test('a poll signs in only on an approved status with both tokens', () => {
    expect(loginPollOutcome({ status: 'approved', accessToken: 'a', refreshToken: 'r' })).toBe(
      'approved'
    );
    expect(loginPollOutcome({ status: 'approved', accessToken: 'a' })).toBe('waiting');
    expect(loginPollOutcome({ status: 'approved', accessToken: 'a', refreshToken: null })).toBe(
      'waiting'
    );
    expect(loginPollOutcome({ status: 'approved', refreshToken: 'r' })).toBe('waiting');
    expect(loginPollOutcome({ status: 'expired' })).toBe('expired');
    expect(loginPollOutcome({ status: 'pending' })).toBe('waiting');
  });

  test('a refused login is a terminal state, like an expired one', () => {
    expect(loginPollOutcome({ status: 'denied' })).toBe('denied');
    expect(settledPhaseOf('denied')).toBe('denied');
    expect(settledPhaseOf('expired')).toBe('expired');
    expect(settledPhaseOf('approved')).toBe('approved');
  });

  test('only a pending answer or a failed poll keeps polling', () => {
    expect(settledPhaseOf('waiting')).toBeNull();
    expect(pollAnswerOutcome({ ok: true, info: { status: 'pending' } })).toBe('waiting');
    expect(pollAnswerOutcome({ ok: false, info: null })).toBe('waiting');
    expect(pollAnswerOutcome({ ok: true, info: null })).toBe('waiting');
    expect(pollAnswerOutcome({ ok: true, info: { status: 'denied' } })).toBe('denied');
    expect(pollAnswerOutcome({ ok: true, info: { status: 'unknown' } })).toBe('waiting');
  });
});
