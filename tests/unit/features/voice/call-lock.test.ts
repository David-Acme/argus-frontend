import { afterEach, describe, expect, test } from 'bun:test';
import { callLockedId, callLockRedirect, callLockTraceReason, outsideCallIdFrom, setCallLock } from '@/features/voice/model/call-lock';

afterEach(() => setCallLock(null));

const LOCKED = { overKeyguard: true, keyguardLocked: true, signedIn: true };
const UNLOCKED = { overKeyguard: true, keyguardLocked: false, signedIn: true };
const NOT_OVER = { overKeyguard: false, keyguardLocked: true, signedIn: true };

describe('the call lock keeps the app on the call only while the keyguard is locked', () => {
  test('with no lock nothing is redirected', () => {
    expect(callLockRedirect('/agenda', callLockedId(), LOCKED)).toBeNull();
  });

  test('while locked over the keyguard, every other route is sent back to the call', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/agenda', callLockedId(), LOCKED)).toBe('/call?callId=call-7&outside=1');
    expect(callLockRedirect('/cameras/12', callLockedId(), LOCKED)).toBe('/call?callId=call-7&outside=1');
    expect(callLockRedirect('/', callLockedId(), LOCKED)).toBe('/call?callId=call-7&outside=1');
  });

  test('an outside answer made while unlocked is not locked to the call', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/agenda', callLockedId(), UNLOCKED)).toBeNull();
  });

  test('a call not shown over the keyguard does not lock the app', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/agenda', callLockedId(), NOT_OVER)).toBeNull();
  });

  test('the call route itself is never redirected', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/call', callLockedId(), LOCKED)).toBeNull();
  });

  test('clearing the lock restores the normal routes', () => {
    setCallLock('call-7');
    setCallLock(null);
    expect(callLockRedirect('/agenda', callLockedId(), LOCKED)).toBeNull();
  });
});

describe('the outside call the guard holds comes from the native side first', () => {
  test('a call the native side holds locks the app even when the call screen never stored it', () => {
    expect(callLockRedirect('/people', outsideCallIdFrom('call-9', null), LOCKED)).toBe('/call?callId=call-9&outside=1');
  });

  test('the native id wins over a stale store value, and an empty native id falls back to the store', () => {
    expect(outsideCallIdFrom('call-9', 'call-7')).toBe('call-9');
    expect(outsideCallIdFrom('', 'call-7')).toBe('call-7');
    expect(outsideCallIdFrom('', null)).toBeNull();
  });

  test('every guard input is written as a flag, in a fixed order', () => {
    expect(callLockTraceReason({ onCall: false, held: true, over: true, locked: false })).toBe(
      'call-0-held-1-over-1-locked-0',
    );
  });
});

describe('a signed-out device is never sent back into the call', () => {
  test('signed out, the guard does not redirect, so the sign-in route is not looped', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/agenda', callLockedId(), { ...LOCKED, signedIn: false })).toBeNull();
    expect(callLockRedirect('/', callLockedId(), { ...LOCKED, signedIn: false })).toBeNull();
  });
});
