import { CryptoDigestAlgorithm, CryptoEncoding, digestStringAsync, getRandomBytes } from 'expo-crypto';

export function secureRandomBytes(length: number): Uint8Array {
  return getRandomBytes(length);
}

export async function sha256Hex(text: string): Promise<string> {
  return digestStringAsync(CryptoDigestAlgorithm.SHA256, text, { encoding: CryptoEncoding.HEX });
}
