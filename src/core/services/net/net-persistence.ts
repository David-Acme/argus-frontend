import { secureStorageService } from '@/core/services/secure-storage';
import { NET_STORAGE_KEYS } from '@/shared/constants';
import type {
  NetAddressUpdate,
  NetAdoptInput,
  NetError,
  NetErrorCode,
  NetPairExpectation,
  NetPairedInstance,
  NetPairing,
  NetRemoteProfile,
  NetRouteMode,
  NetRoutePorts,
} from '@/core/types';
import { usableRemote } from './net-route-choice';

let cachedInstance: NetPairedInstance | null | undefined;

const STORED_INSTANCE_KEYS = [
  NET_STORAGE_KEYS.caPem,
  NET_STORAGE_KEYS.host,
  NET_STORAGE_KEYS.ip,
  NET_STORAGE_KEYS.port,
  NET_STORAGE_KEYS.caFingerprint,
  NET_STORAGE_KEYS.instanceId,
  NET_STORAGE_KEYS.pairedAt,
  NET_STORAGE_KEYS.routes,
  NET_STORAGE_KEYS.remoteHomeId,
  NET_STORAGE_KEYS.remoteDomain,
] as const;

export type StoredInstance = Readonly<Partial<Record<(typeof STORED_INSTANCE_KEYS)[number], string | null>>>;

export async function isPaired(): Promise<boolean> {
  if (cachedInstance !== undefined) return cachedInstance !== null;
  return (await secureStorageService.getStringAsync(NET_STORAGE_KEYS.paired)) === 'true';
}

export function storedInstance(stored: StoredInstance): NetPairedInstance | null {
  const caPem = stored[NET_STORAGE_KEYS.caPem];
  const host = stored[NET_STORAGE_KEYS.host];
  const ip = stored[NET_STORAGE_KEYS.ip];
  const port = stored[NET_STORAGE_KEYS.port];
  if (!caPem || !host || !ip || !port) return null;

  const remote = {
    homeId: stored[NET_STORAGE_KEYS.remoteHomeId] ?? '',
    domain: stored[NET_STORAGE_KEYS.remoteDomain] ?? '',
  };
  return {
    host,
    ip,
    port: Number(port),
    caPem,
    caFingerprint: stored[NET_STORAGE_KEYS.caFingerprint] ?? '',
    instanceId: stored[NET_STORAGE_KEYS.instanceId] ?? '',
    pairedAt: Number(stored[NET_STORAGE_KEYS.pairedAt] ?? 0),
    routes: parseRoutes(stored[NET_STORAGE_KEYS.routes] ?? null),
    ...(usableRemote(remote) ? { remote } : {}),
  };
}

export async function loadInstance(): Promise<NetPairedInstance | null> {
  if (cachedInstance !== undefined) return cachedInstance;

  if (!(await isPaired())) {
    cachedInstance = null;
    return null;
  }

  const values = await Promise.all(STORED_INSTANCE_KEYS.map((key) => secureStorageService.getStringAsync(key)));
  cachedInstance = storedInstance(
    Object.fromEntries(STORED_INSTANCE_KEYS.map((key, index) => [key, values[index] ?? null]))
  );
  return cachedInstance;
}

const sameRemote = (left: NetRemoteProfile | undefined, right: NetRemoteProfile): boolean =>
  left !== undefined && left.homeId === right.homeId && left.domain === right.domain;

export function rememberRoute(route: NetRouteMode): void {
  if (cachedInstance) cachedInstance = { ...cachedInstance, route };
}

export async function saveRemote(remote: NetRemoteProfile): Promise<boolean> {
  if (!usableRemote(remote)) return false;
  const instance = await loadInstance();
  if (!instance || sameRemote(instance.remote, remote)) return false;
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.remoteHomeId, remote.homeId);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.remoteDomain, remote.domain);
  if (cachedInstance) cachedInstance = { ...cachedInstance, remote: { homeId: remote.homeId, domain: remote.domain } };
  return true;
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

export function matchesExpectation(pairing: NetPairing, expect: NetPairExpectation | undefined): boolean {
  if (!expect) return true;
  return (
    pairing.caFingerprint.toLowerCase() === expect.caFingerprint.toLowerCase() &&
    pairing.instanceId.toLowerCase() === expect.instanceId.toLowerCase()
  );
}

export async function savePairing(input: NetAdoptInput): Promise<void> {
  const { pairing, host, ip } = input;
  cachedInstance = undefined;
  await secureStorageService.deleteAsync(NET_STORAGE_KEYS.paired);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.caPem, pairing.caPem);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.caFingerprint, pairing.caFingerprint);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.host, host);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.ip, ip);
  await savePairingMetadata(input);
}

export async function savePairingMetadata(input: NetAdoptInput): Promise<void> {
  const { pairing, host, ip, routes } = input;
  const pairedAt = Date.now();
  cachedInstance = undefined;
  await secureStorageService.deleteAsync(NET_STORAGE_KEYS.remoteHomeId);
  await secureStorageService.deleteAsync(NET_STORAGE_KEYS.remoteDomain);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.port, String(pairing.port));
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.instanceId, pairing.instanceId);
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.pairedAt, String(pairedAt));
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.routes, JSON.stringify(routes));
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.paired, 'true');

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
  await rememberInstanceAddress(update);
}

export async function rememberInstanceAddress(update: NetAddressUpdate): Promise<void> {
  await secureStorageService.setStringAsync(NET_STORAGE_KEYS.routes, JSON.stringify(update.routes));
  if (cachedInstance) cachedInstance = { ...cachedInstance, ip: update.ip, routes: update.routes };
}

export async function clearInstance(keep: readonly string[] = []): Promise<void> {
  cachedInstance = null;
  for (const key of Object.values(NET_STORAGE_KEYS)) {
    if (keep.includes(key)) continue;
    await secureStorageService.deleteAsync(key);
  }
}

const NATIVE_ERROR_CODES: ReadonlySet<NetErrorCode> = new Set([
  'PAIRING_REQUIRED',
  'INVALID_PAIRING_CODE',
  'ALREADY_PAIRED',
  'PAIRING_DECLINED',
  'FINGERPRINT_MISMATCH',
  'CERT_NOT_TRUSTED',
  'UNAUTHORIZED',
  'HOST_NOT_ALLOWED',
  'DISCOVERY_NOT_FOUND',
  'NETWORK_ERROR',
  'TIMEOUT',
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
  else if (upper.includes('UNAUTHORIZED')) code = 'UNAUTHORIZED';
  else if (upper.includes('DISCOVERY_NOT_FOUND')) code = 'DISCOVERY_NOT_FOUND';
  else if (upper.includes('NETWORK_ERROR')) code = 'NETWORK_ERROR';
  else if (upper.includes('STORAGE')) code = 'STORAGE_ERROR';
  return { code, message: raw };
}
