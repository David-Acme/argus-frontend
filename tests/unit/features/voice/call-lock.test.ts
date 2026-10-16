import { afterEach, describe, expect, test } from 'bun:test';
import { callLockedId, callLockRedirect, setCallLock } from '@/features/voice/model/call-lock';

afterEach(() => setCallLock(null));

const LOCKED = { overKeyguard: true, keyguardLocked: true };
const UNLOCKED = { overKeyguard: true, keyguardLocked: false };
const NOT_OVER = { overKeyguard: false, keyguardLocked: true };

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
