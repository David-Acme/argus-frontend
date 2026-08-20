import type { QrPairingPayload } from '@/core/types';
import {
  PAIRING_CODE_PATTERN,
  PAIRING_FINGERPRINT_PATTERN,
  PAIRING_HOST_SUFFIX,
  PAIRING_QR_REQUIRED_KEYS,
} from '@/shared/constants';

const isHexFingerprint = (value: unknown): boolean =>
  typeof value === 'string' && PAIRING_FINGERPRINT_PATTERN.test(value);

/** Parses and validates the server banner QR JSON. `null` if not an Argus QR. */
export function parsePairingQr(raw: string): QrPairingPayload | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;

  const value = json as Record<string, unknown>;
  for (const key of PAIRING_QR_REQUIRED_KEYS) {
    if (!(key in value)) return null;
  }

  const { host, port, scheme, code, instanceId, caFingerprint, serverFingerprint } = value;
  if (typeof host !== 'string' || !host.endsWith(PAIRING_HOST_SUFFIX)) return null;
  if (typeof port !== 'number' || !Number.isInteger(port) || port <= 0 || port > 65535) {
    return null;
  }
  if (scheme !== 'https') return null;
  if (typeof code !== 'string' || !PAIRING_CODE_PATTERN.test(code)) return null;
  if (!isHexFingerprint(instanceId) || !isHexFingerprint(caFingerprint)) return null;
  if (!isHexFingerprint(serverFingerprint)) return null;

  return {
    host,
    port,
    scheme,
    code,
    instanceId,
    caFingerprint,
    serverFingerprint,
    ...(typeof value.serviceType === 'string' ? { serviceType: value.serviceType } : {}),
    ...(typeof value.txt === 'object' && value.txt !== null
      ? { txt: value.txt as Record<string, string> }
      : {}),
  } as QrPairingPayload;
}

/** Is it a plain pairing code (8-12 hex)? Manual entry fallback. */
export function isPairingCode(value: string): boolean {
  return PAIRING_CODE_PATTERN.test(value.trim());
}

/** Human-readable host for the UI, without the `.local` suffix. */
export function hostLabel(host: string): string {
  return host.endsWith(PAIRING_HOST_SUFFIX) ? host.slice(0, -PAIRING_HOST_SUFFIX.length) : host;
}