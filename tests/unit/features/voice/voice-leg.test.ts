import { describe, expect, test } from 'bun:test';
import { voiceLegOf } from '@/features/voice/model/voice-leg';

describe('voiceLegOf', () => {
  test('the mobile app is the phone and every web or desktop build is the laptop', () => {
    expect(voiceLegOf(true)).toBe('phone');
    expect(voiceLegOf(false)).toBe('laptop');
  });
});
