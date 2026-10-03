import type { IHttpConfig } from '@/core/interfaces';

const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const KEY_BYTES = 16;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

function randomBytes(): Uint8Array {
  const bytes = new Uint8Array(KEY_BYTES);
  const crypto = globalThis.crypto as Crypto | undefined;
  if (crypto && typeof crypto.getRandomValues === 'function') return crypto.getRandomValues(bytes);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  return bytes;
}

export function newIdempotencyKey(): string {
  return toHex(randomBytes());
}

export function idempotentConfig(key: string | undefined): IHttpConfig {
  return key ? { headers: { [IDEMPOTENCY_HEADER]: key } } : {};
}
