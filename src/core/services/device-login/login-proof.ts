import { secureRandomBytes, sha256Hex } from '@/core/services/crypto-random';

export type LoginProof = {
  proof: string;
  pollHash: string;
};

export type LoginProofSources = {
  randomBytes: (length: number) => Uint8Array;
  sha256Hex: (text: string) => Promise<string>;
};

const PROOF_BYTES = 32;

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const PLATFORM_SOURCES: LoginProofSources = { randomBytes: secureRandomBytes, sha256Hex };

export async function createLoginProof(sources: LoginProofSources = PLATFORM_SOURCES): Promise<LoginProof> {
  const proof = toHex(sources.randomBytes(PROOF_BYTES));
  return { proof, pollHash: await sources.sha256Hex(proof) };
}
