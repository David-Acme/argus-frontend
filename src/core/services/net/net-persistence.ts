import { secureStorageService } from '@/core/services/secure-storage';
import { NET_STORAGE_KEYS } from '@/shared/constants';
import type {
  NetAddressUpdate,
  NetAdoptInput,
  NetError,
  NetErrorCode,
  NetPairedInstance,
  NetRoutePorts,
} from '@/core/types';

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

  const [caPem, host, ip, port, caFingerprint, instanceId, pairedAt, routes] = await Promise.all(
    [
      NET_STORAGE_KEYS.caPem,
      NET_STORAGE_KEYS.host,
      NET_STORAGE_KEYS.ip,
      NET_STORAGE_KEYS.port,
      NET_STORAGE_KEYS.caFingerprint,
      NET_STORAGE_KEYS.instanceId,
      NET_STORAGE_KEYS.pairedAt,
      NET_STORAGE_KEYS.routes,
    ].map((key) => secureStorageService.getStringAsync(key))
  );

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
    routes: parseRoutes(routes ?? null),
  };
  return cachedInstance;
}

function parseRoutes(raw: string | null): NetRoutePorts {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      ),
    );
  } catch {
    return {};
  }
}

export async function savePairing(input: NetAdoptInput): Promise<void> {
  const { pairing, host, ip, routes } = input;
  const pairedAt = Date.now();
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.paired, 'true');
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.caPem, pairing.caPem);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.caFingerprint, pairing.caFingerprint);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.host, host);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.ip, ip);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.port, String(pairing.port));
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.instanceId, pairing.instanceId);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.pairedAt, String(pairedAt));
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.routes, JSON.stringify(routes));

  cachedInstance = {
    host,
    ip,
    port: pairing.port,
    caPem: pairing.caPem,
    caFingerprint: pairing.caFingerprint,
    instanceId: pairing.instanceId,
    pairedAt,
    routes,
  };
}

export async function updateInstanceAddress(update: NetAddressUpdate): Promise<void> {
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.ip, update.ip);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.routes, JSON.stringify(update.routes));
  if (cachedInstance) cachedInstance = { ...cachedInstance, ip: update.ip, routes: update.routes };
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
  'ALREADY_PAIRED',
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

  const [token = '', ...rest] = raw.split('|');
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
