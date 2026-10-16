import { afterEach, describe, expect, test } from 'bun:test';
import { callLockedId, callLockRedirect, setCallLock } from '@/features/voice/model/call-lock';

afterEach(() => setCallLock(null));

describe('the call lock keeps the app on the call while an outside answer is up', () => {
  test('with no lock nothing is redirected', () => {
    expect(callLockRedirect('/agenda', callLockedId())).toBeNull();
  });

  test('while locked, every other route is sent back to the call', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/agenda', callLockedId())).toBe('/call?callId=call-7&outside=1');
    expect(callLockRedirect('/cameras/12', callLockedId())).toBe('/call?callId=call-7&outside=1');
    expect(callLockRedirect('/', callLockedId())).toBe('/call?callId=call-7&outside=1');
  });

  test('the call route itself is never redirected', () => {
    setCallLock('call-7');
    expect(callLockRedirect('/call', callLockedId())).toBeNull();
  });

  test('clearing the lock restores the normal routes', () => {
    setCallLock('call-7');
    setCallLock(null);
    expect(callLockRedirect('/agenda', callLockedId())).toBeNull();
  });
});
