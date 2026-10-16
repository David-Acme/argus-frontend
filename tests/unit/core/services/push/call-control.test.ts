import { describe, expect, it } from 'bun:test';
import { callControlActionOf } from '@/core/services/push/call-control';

describe('callControlActionOf', () => {
  it('reads the hang-up and mute actions the native call controls send', () => {
    expect(callControlActionOf('hangup')).toBe('hangup');
    expect(callControlActionOf('mute-on')).toBe('mute-on');
    expect(callControlActionOf('mute-off')).toBe('mute-off');
  });

  it('ignores anything else', () => {
    expect(callControlActionOf('speaker')).toBeNull();
    expect(callControlActionOf('')).toBeNull();
  });
});
