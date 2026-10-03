export type LoginProof = {
  proof: string;
  pollHash: string;
};

const PROOF_BYTES = 32;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export async function createLoginProof(): Promise<LoginProof | null> {
  const crypto = globalThis.crypto as Crypto | undefined;
  if (!crypto?.subtle || typeof crypto.getRandomValues !== 'function') return null;
  const proof = toHex(crypto.getRandomValues(new Uint8Array(PROOF_BYTES)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(proof));
  return { proof, pollHash: toHex(new Uint8Array(digest)) };
}
