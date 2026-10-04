import type { ClientIdentity } from '@/core/types';

const DEVICE_NAME_MAX = 64;
const VERSION_SHAPE = /^[0-9A-Za-z.+-]{1,32}$/;
const UNKNOWN_VERSION = '0';

export const CLIENT_HEADER = 'X-Argus-Client';
export const DEVICE_HEADER = 'X-Argus-Device';
export const USER_AGENT_HEADER = 'User-Agent';

const isControl = (char: string): boolean => {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x20 || (code >= 0x7f && code <= 0x9f);
};

const encodeName = (name: string): string | null => {
  try {
    return encodeURIComponent(name);
  } catch {
    return null;
  }
};

export function cleanDeviceName(name: string | null | undefined): string | null {
  if (!name) return null;
  const cleaned = Array.from(name, (char) => (isControl(char) ? ' ' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return Array.from(cleaned).slice(0, DEVICE_NAME_MAX).join('').trim();
}

export function cleanAppVersion(version: string | null | undefined): string {
  const trimmed = version?.trim() ?? '';
  return VERSION_SHAPE.test(trimmed) ? trimmed : UNKNOWN_VERSION;
}

export function clientIdentityHeaders(identity: ClientIdentity): Record<string, string> {
  const headers: Record<string, string> = {
    [USER_AGENT_HEADER]: `Argus/1 (${identity.platform})`,
    [CLIENT_HEADER]: `${identity.platform}/${cleanAppVersion(identity.appVersion)}`,
  };
  const deviceName = cleanDeviceName(identity.deviceName);
  const encoded = deviceName ? encodeName(deviceName) : null;
  if (encoded) headers[DEVICE_HEADER] = encoded;
  return headers;
}

export function withClientIdentity(
  headers: Record<string, string> | undefined,
  identity: Record<string, string>
): Record<string, string> {
  const merged: Record<string, string> = {};
  const owned = new Set(Object.keys(identity).map((name) => name.toLowerCase()));
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (!owned.has(name.toLowerCase())) merged[name] = value;
  }
  return { ...merged, ...identity };
}
