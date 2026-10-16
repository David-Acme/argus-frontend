import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { createLoginProof } from '@/core/services/device-login';
import { secureRandomBytes, sha256Hex } from '@/core/services/crypto-random';

describe('device login proof', () => {
  test('the poll hash is the SHA-256 of the proof the desktop keeps', async () => {
    const proof = await createLoginProof();
    expect(proof.proof).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.pollHash).toBe(createHash('sha256').update(proof.proof).digest('hex'));
  });

  test('every challenge gets its own proof', async () => {
    const [first, second] = await Promise.all([createLoginProof(), createLoginProof()]);
    expect(first.proof).not.toBe(second.proof);
  });

  test('the proof matches the auth service vector byte for byte', async () => {
    const proof = await createLoginProof({
      randomBytes: (length) => Uint8Array.from({ length }, (_, index) => index),
      sha256Hex,
    });
    expect(proof.proof).toBe('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');
    expect(proof.pollHash).toBe('6c86c6aac5fb24bcf5d9939cb7d7d5645ce39418f449e03b262dd4fa14b4b92b');
  });

  test('a runtime with a native source never answers without a proof', async () => {
    const proof = await createLoginProof({
      randomBytes: (length) => new Uint8Array(length).fill(7),
      sha256Hex: async (text) => createHash('sha256').update(text).digest('hex'),
    });
    expect(proof.proof).toBe('07'.repeat(32));
    expect(proof.pollHash).toBe(createHash('sha256').update('07'.repeat(32)).digest('hex'));
  });
});

describe('secure random', () => {
  test('SHA-256 of abc is the standard digest', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('random bytes have the asked length and differ between calls', () => {
    const first = secureRandomBytes(32);
    const second = secureRandomBytes(32);
    expect(first.length).toBe(32);
    expect(Array.from(first)).not.toEqual(Array.from(second));
  });
});
