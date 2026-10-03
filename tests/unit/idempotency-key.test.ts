import { describe, expect, test } from 'bun:test';
import { idempotentConfig, newIdempotencyKey } from '@/core/services/http/idempotency-key';

describe('idempotency key', () => {
  test('a key is 32 lowercase hex characters, the shape productivity accepts', () => {
    expect(newIdempotencyKey()).toMatch(/^[0-9a-f]{32}$/);
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });

  test('the header travels only when a key is given', () => {
    expect(idempotentConfig('abc')).toEqual({ headers: { 'Idempotency-Key': 'abc' } });
    expect(idempotentConfig(undefined)).toEqual({});
  });
});
