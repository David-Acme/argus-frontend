import { describe, expect, test } from 'bun:test';
import { micTraceReason } from '@/features/voice/model/mic-trace';

describe('the background trace names whether the microphone is still publishing', () => {
  test('a publishing microphone and a stopped one are told apart', () => {
    expect(micTraceReason(true)).toBe('mic-publishing');
    expect(micTraceReason(false)).toBe('mic-stopped');
  });
});
