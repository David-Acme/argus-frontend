import { describe, expect, mock, test } from 'bun:test';
import { withTimeout } from '@/features/voice/model/with-timeout';

describe('withTimeout', () => {
  test('a request that answers in time passes its answer through', async () => {
    await expect(withTimeout(Promise.resolve('granted'), 50)).resolves.toBe('granted');
  });

  test('a request that never answers rejects once the bound passes', async () => {
    const never = new Promise<string>(() => undefined);
    await expect(withTimeout(never, 20)).rejects.toThrow('RTC_TOKEN_TIMEOUT');
  });

  test('a failing request keeps its own error', async () => {
    const failing = Promise.reject(new Error('network down'));
    await expect(withTimeout(failing, 50)).rejects.toThrow('network down');
  });
});
