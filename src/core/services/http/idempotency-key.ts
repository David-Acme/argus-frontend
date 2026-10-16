import type { IHttpConfig } from '@/core/interfaces';
import { secureRandomBytes } from '@/core/services/crypto-random';

const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const KEY_BYTES = 16;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export function newIdempotencyKey(): string {
  return toHex(secureRandomBytes(KEY_BYTES));
}

export function idempotentConfig(key: string | undefined): IHttpConfig {
  return key ? { headers: { [IDEMPOTENCY_HEADER]: key } } : {};
}
