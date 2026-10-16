import { describe, expect, test } from 'bun:test';
import { shouldAskBackground } from '@/features/voice/model/background-ask';

describe('asking to keep hearing in the background', () => {
  test('a live call without the permission asks once', () => {
    expect(shouldAskBackground({ inCall: true, allowed: false, asked: false })).toBe(true);
    expect(shouldAskBackground({ inCall: true, allowed: false, asked: true })).toBe(false);
  });

  test('nothing is asked outside a call or when it is already allowed', () => {
    expect(shouldAskBackground({ inCall: false, allowed: false, asked: false })).toBe(false);
    expect(shouldAskBackground({ inCall: true, allowed: true, asked: false })).toBe(false);
  });
});
