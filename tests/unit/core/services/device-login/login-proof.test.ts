import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { createLoginProof } from '@/core/services/device-login';

describe('device login proof', () => {
  test('the poll hash is the SHA-256 of the proof the desktop keeps', async () => {
    const proof = await createLoginProof();
    expect(proof).not.toBeNull();
    expect(proof?.proof).toMatch(/^[0-9a-f]{64}$/);
    expect(proof?.pollHash).toBe(createHash('sha256').update(proof?.proof ?? '').digest('hex'));
  });

  test('every challenge gets its own proof', async () => {
    const [first, second] = await Promise.all([createLoginProof(), createLoginProof()]);
    expect(first?.proof).not.toBe(second?.proof);
  });
});
