import { describe, expect, test } from 'bun:test';
import { traceReasonOf } from '@/core/services/native-trace-reason';

describe('the reason written to the native trace', () => {
  test('a code is shaped to lower-case words joined by dashes', () => {
    expect(traceReasonOf('CALL_CONNECT_FAILED')).toBe('call-connect-failed');
    expect(traceReasonOf('Answer Outcome: gone')).toBe('answer-outcome-gone');
  });

  test('a value with nothing usable becomes unknown, never empty', () => {
    expect(traceReasonOf('|!!')).toBe('unknown');
    expect(traceReasonOf('')).toBe('unknown');
  });

  test('a long value is capped and never carries separators or spaces', () => {
    const reason = traceReasonOf(`token=${'x'.repeat(200)} | secret`);
    expect(reason.length).toBeLessThanOrEqual(64);
    expect(reason).toMatch(/^[a-z0-9-]+$/);
  });
});
