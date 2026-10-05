export const DEVICE_CREDENTIAL_HEADER = 'X-Argus-Device-Credential';

const MAX_CREDENTIAL_LENGTH = 256;
const CREDENTIAL_SHAPE = /^[\x21-\x7e]+$/;

let current: string | null = null;

export function cleanDeviceCredential(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed.length > MAX_CREDENTIAL_LENGTH) return null;
  return CREDENTIAL_SHAPE.test(trimmed) ? trimmed : null;
}

export function setDeviceCredential(value: string | null | undefined): void {
  current = cleanDeviceCredential(value);
}

export function deviceCredential(): string | null {
  return current;
}

export function withDeviceCredential(
  headers: Record<string, string> | undefined,
  credential: string | null = current,
): Record<string, string> {
  const merged: Record<string, string> = {};
  const owned = DEVICE_CREDENTIAL_HEADER.toLowerCase();
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (name.toLowerCase() !== owned) merged[name] = value;
  }
  if (credential) merged[DEVICE_CREDENTIAL_HEADER] = credential;
  return merged;
}
