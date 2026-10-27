import { describe, expect, test } from 'bun:test';
import {
  approveNoteOf,
  approveTitleOf,
  deviceGlyphOf,
  fromHome,
  refusedPhase,
} from '@/features/auth/model/approve';
import { consentSignalsOf } from '@/features/auth/model/consent-signals';
import { callStepOf } from '@/features/auth/model/first-call';
import { invitationCopyOf, invitationOutcomeOf } from '@/features/auth/model/invitation-outcome';
import { countdownOf, secondsLeft } from '@/features/auth/model/login-countdown';
import { loginActionOf, loginHeadingOf, showsQr } from '@/features/auth/model/login-screen';
import { moduleGlyphOf } from '@/features/auth/model/module-glyph';
import { readyRowsOf } from '@/features/auth/model/ready-rows';

describe('the sign-in on another device', () => {
  test('counts down in minutes and seconds', () => {
    expect(secondsLeft(1000, 840_000)).toBe(160);
    expect(countdownOf(160)).toBe('2:40');
    expect(countdownOf(5)).toBe('0:05');
    expect(secondsLeft(null, 0)).toBe(0);
    expect(secondsLeft(10, 20_000)).toBe(0);
  });

  test('speaks to the phone or to the computer', () => {
    expect(loginHeadingOf('qr', false).title).toBe('screens.login.title');
    expect(loginHeadingOf('qr', true).title).toBe('screens.login.title-phone');
    expect(loginHeadingOf('error', false).title).toBe('screens.login.error.title');
    expect(loginHeadingOf('waiting-owner', true).title).toBe('screens.login.waiting-owner.title');
  });

  test('offers one action for each stop, and hides the code when there is none', () => {
    expect(loginActionOf('expired')).toEqual({
      action: 'refresh',
      label: 'screens.login.new-code',
    });
    expect(loginActionOf('error')?.action).toBe('retry-owner');
    expect(loginActionOf('qr')).toBeNull();
    expect(showsQr('loading')).toBe(true);
    expect(showsQr('error')).toBe(false);
  });
});

describe('approving on the phone', () => {
  test('names the device that asks', () => {
    expect(approveTitleOf('desktop')).toBe('screens.approve.confirm-title.desktop');
    expect(approveTitleOf('ios')).toBe('screens.approve.confirm-title.phone');
    expect(approveTitleOf('web')).toBe('screens.approve.confirm-title.other');
    expect(deviceGlyphOf('desktop')).toBe('laptop');
  });

  test('warns when the request comes from outside the home', () => {
    const details = {
      challengeId: 'x',
      platform: 'desktop' as const,
      deviceName: '',
      ipAddress: '',
      createdAt: 0,
      expiresAt: 0,
    };
    expect(fromHome({ ...details, origin: 'lan' })).toBe(true);
    expect(fromHome({ ...details, origin: 'tunnel' })).toBe(false);
  });

  test('a gone code is expired, anything else an error', () => {
    expect(refusedPhase(410)).toBe('expired');
    expect(refusedPhase(500)).toBe('error');
    expect(approveNoteOf('denied')).toEqual({ tone: 'ok', key: 'screens.approve.denied' });
    expect(approveNoteOf('confirm')).toBeNull();
  });
});

describe('the invitation', () => {
  test('a valid one shows the role it brings', () => {
    const valid = invitationOutcomeOf({ ok: true, status: 200, role: 'resident', errors: null });
    expect(valid).toEqual({ phase: 'valid', role: 'resident', revoked: null });
    expect(invitationCopyOf(valid)).toEqual({
      title: 'screens.invitation.valid-title',
      lead: 'screens.invitation.role.resident',
      action: 'accept',
    });
  });

  test('a used, expired or revoked one says it no longer works', () => {
    const gone = invitationOutcomeOf({
      ok: false,
      status: 410,
      role: null,
      errors: { code: 'GONE', message: 'x' },
    });
    expect(gone.phase).toBe('expired');
    expect(invitationCopyOf(gone).action).toBe('understood');
    const revoked = invitationOutcomeOf({
      ok: false,
      status: 410,
      role: null,
      errors: {
        code: 'INVITATION_MODULE_DISABLED',
        message: 'x',
        list: [{ code: 'MODULE_ID', message: 'surveillance' }],
      },
    });
    expect(revoked).toEqual({
      phase: 'expired',
      role: null,
      revoked: { moduleId: 'surveillance' },
    });
  });

  test('a foreign server stops, and no network asks to retry', () => {
    expect(
      invitationOutcomeOf({
        ok: false,
        status: 200,
        role: null,
        errors: { code: 'FINGERPRINT_MISMATCH', message: 'x' },
      }).phase
    ).toBe('mismatch');
    expect(
      invitationOutcomeOf({
        ok: false,
        status: 0,
        role: null,
        errors: { code: 'NETWORK_ERROR', message: 'x' },
      }).phase
    ).toBe('unreachable');
    expect(invitationCopyOf({ phase: 'idle', role: null, revoked: null }).action).toBe('scan');
  });
});

describe('the last steps', () => {
  test('the owner consents to the core signals, an invited person to all of them', () => {
    expect(consentSignalsOf('owner', ['voiceLearning'])).toEqual(['voiceLearning']);
    expect(consentSignalsOf('invited', ['voiceLearning'])).toHaveLength(4);
  });

  test('the first call is skipped without a microphone or a voice path', () => {
    const ready = { supported: true, loaded: true, microphone: true };
    expect(callStepOf(ready)).toBe('call');
    expect(callStepOf({ ...ready, microphone: false })).toBe('skip');
    expect(callStepOf({ ...ready, supported: false })).toBe('skip');
    expect(callStepOf({ ...ready, loaded: false })).toBe('wait');
  });

  test('ready lists only what was set up', () => {
    expect(readyRowsOf({ modules: [], alerts: false }).map((row) => row.key)).toEqual(['face']);
    expect(
      readyRowsOf({ modules: ['surveillance', 'productivity'], alerts: true }).map((row) => row.key)
    ).toEqual(['face', 'security', 'productivity', 'alerts']);
    expect(readyRowsOf({ modules: [], alerts: false }).every((row) => row.done)).toBe(true);
  });

  test('module cards carry their own glyph', () => {
    expect(moduleGlyphOf('surveillance')).toBe('shield');
    expect(moduleGlyphOf('productivity')).toBe('cal');
    expect(moduleGlyphOf('agronomy')).toBe('grid');
  });
});
