import { describe, expect, test } from 'bun:test';
import { registerCallActionHeadlessTask } from '@/features/voice/services/call-action/call-action-registration.web';

describe('the call action headless registration in the web bundle', () => {
  test('the web variant is a no-op', () => {
    expect(registerCallActionHeadlessTask()).toBeUndefined();
  });
});
