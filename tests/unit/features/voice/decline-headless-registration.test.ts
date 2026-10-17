import { describe, expect, test } from 'bun:test';
import { registerDeclineHeadlessTask } from '@/features/voice/services/decline/decline-headless-registration.web';

describe('the decline headless registration in the web bundle', () => {
  test('the web variant is a no-op, so the entry loads where react-native-web has no headless registry', () => {
    expect(registerDeclineHeadlessTask()).toBeUndefined();
  });
});
