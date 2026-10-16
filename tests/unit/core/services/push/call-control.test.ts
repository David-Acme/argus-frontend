import { describe, expect, it } from 'bun:test';
import { callControlActionOf, callEndpointsOf } from '@/core/services/push/call-control';

describe('callControlActionOf', () => {
  it('reads the hang-up and mute actions the native call controls send', () => {
    expect(callControlActionOf('hangup')).toBe('hangup');
    expect(callControlActionOf('mute-on')).toBe('mute-on');
    expect(callControlActionOf('mute-off')).toBe('mute-off');
    expect(callControlActionOf('endpoints')).toBe('endpoints');
  });

  it('ignores anything else', () => {
    expect(callControlActionOf('speaker')).toBeNull();
    expect(callControlActionOf('')).toBeNull();
  });

  it('reads the Telecom endpoints and drops malformed entries', () => {
    const endpoints = callEndpointsOf(
      JSON.stringify([
        { id: 'a', kind: 'speaker', name: 'Speaker', active: true },
        { id: 'b', kind: 'hologram', name: 'Odd', active: false },
        { id: '', kind: 'earpiece', name: 'Earpiece', active: false },
        { kind: 'earpiece' },
      ]),
    );
    expect(endpoints).toEqual([
      { id: 'a', kind: 'speaker', name: 'Speaker', active: true },
      { id: 'b', kind: 'unknown', name: 'Odd', active: false },
    ]);
    expect(callEndpointsOf('not json')).toEqual([]);
    expect(callEndpointsOf('{}')).toEqual([]);
  });
});
