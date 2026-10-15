import { describe, expect, test } from 'bun:test';
import { incomingSurfaceVisible, isCriticalRing } from '@/features/voice/model/incoming-surface';

describe('the incoming-call surface', () => {
  test('a held ring is visible from any screen but the call screen', () => {
    expect(incomingSurfaceVisible({ callId: 'call-41' }, '/')).toBe(true);
    expect(incomingSurfaceVisible({ callId: 'call-41' }, '/cameras')).toBe(true);
    expect(incomingSurfaceVisible({ callId: 'call-41' }, '/call')).toBe(false);
  });

  test('without a held ring nothing is shown', () => {
    expect(incomingSurfaceVisible(null, '/')).toBe(false);
  });

  test('only a critical ring is treated as an alert that sounds without an answer', () => {
    expect(isCriticalRing('critical')).toBe(true);
    expect(isCriticalRing('time_sensitive')).toBe(false);
    expect(isCriticalRing('active')).toBe(false);
    expect(isCriticalRing(undefined)).toBe(false);
  });
});
