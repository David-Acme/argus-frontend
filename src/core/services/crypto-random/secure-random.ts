const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export function secureRandomBytes(length: number): Uint8Array {
  const crypto = globalThis.crypto as Crypto | undefined;
  if (!crypto || typeof crypto.getRandomValues !== 'function') {
    throw new Error('No cryptographically secure random source is available on this runtime');
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function sha256Hex(text: string): Promise<string> {
  const crypto = globalThis.crypto as Crypto | undefined;
  if (!crypto?.subtle) throw new Error('No SHA-256 is available on this runtime');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}
