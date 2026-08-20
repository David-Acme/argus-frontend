import { secureStorageService } from '@/core/services/secure-storage';
import { NET_STORAGE_KEYS } from '@/shared/constants';
import type { NetError, NetErrorCode, NetPairedInstance, NetPairing } from '@/core/types';

let cachedInstance: NetPairedInstance | null | undefined;

export async function isPaired(): Promise<boolean> {
  if (cachedInstance !== undefined) return cachedInstance !== null;
  return (await secureStorageService.getStringAsync(NET_STORAGE_KEYS.paired)) === 'true';
}

export async function loadInstance(): Promise<NetPairedInstance | null> {
  if (cachedInstance !== undefined) return cachedInstance;

  if (!(await isPaired())) {
    cachedInstance = null;
    return null;
  }

  const caPem = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.caPem);
  const host = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.host);
  const ip = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.ip);
  const port = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.port);
  const caFingerprint = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.caFingerprint);
  const instanceId = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.instanceId);
  const pairedAt = await secureStorageService.getStringAsync(NET_STORAGE_KEYS.pairedAt);

  if (!caPem || !host || !ip || !port) {
    cachedInstance = null;
    return null;
  }

  cachedInstance = {
    host,
    ip,
    port: Number(port),
    caPem,
    caFingerprint: caFingerprint ?? '',
    instanceId: instanceId ?? '',
    pairedAt: Number(pairedAt ?? 0),
  };
  return cachedInstance;
}

export async function savePairing(result: NetPairing, host: string, ip: string): Promise<void> {
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.paired, 'true');
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.caPem, result.caPem);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.caFingerprint, result.caFingerprint);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.host, host);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.ip, ip);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.port, String(result.port));
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.instanceId, result.instanceId);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.pairedAt, String(Date.now()));

  cachedInstance = {
    host,
    ip,
    port: result.port,
    caPem: result.caPem,
    caFingerprint: result.caFingerprint,
    instanceId: result.instanceId,
    pairedAt: Date.now(),
  };
}

export async function clearInstance(): Promise<void> {
  cachedInstance = null;
  for (const key of Object.values(NET_STORAGE_KEYS)) {
    await secureStorageService.deleteAsync(key);
  }
}

const NATIVE_ERROR_CODES: ReadonlySet<NetErrorCode> = new Set([
  'PAIRING_REQUIRED',
  'INVALID_PAIRING_CODE',
  'FINGERPRINT_MISMATCH',
  'CERT_NOT_TRUSTED',
  'UNAUTHORIZED',
  'HOST_NOT_ALLOWED',
  'DISCOVERY_NOT_FOUND',
  'NETWORK_ERROR',
  'STORAGE_ERROR',
]);

export function toNetError(error: unknown, fallback: NetErrorCode): NetError {
  const raw = error instanceof Error ? error.message : String(error);

  const [token, ...rest] = raw.split('|');
  if (NATIVE_ERROR_CODES.has(token as NetErrorCode)) {
    return { code: token as NetErrorCode, message: rest.join('|') || token };
  }

  const upper = raw.toUpperCase();
  let code: NetErrorCode = fallback;
  if (upper.includes('INVALID_PAIRING_CODE')) code = 'INVALID_PAIRING_CODE';
  else if (upper.includes('HOST_NOT_ALLOWED')) code = 'HOST_NOT_ALLOWED';
  else if (upper.includes('PAIRING_REQUIRED')) code = 'PAIRING_REQUIRED';
  else if (upper.includes('FINGERPRINT')) code = 'FINGERPRINT_MISMATCH';
  else if (upper.includes('CERTIFICATE')) code = 'CERT_NOT_TRUSTED';
  else if (upper.includes('UNAUTHORIZED') || upper.includes('401')) code = 'UNAUTHORIZED';
  else if (upper.includes('DISCOVERY_NOT_FOUND')) code = 'DISCOVERY_NOT_FOUND';
  else if (upper.includes('NETWORK_ERROR')) code = 'NETWORK_ERROR';
  else if (upper.includes('STORAGE')) code = 'STORAGE_ERROR';
  return { code, message: raw };
}
