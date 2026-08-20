/** Payload carried by the desktop device-login QR. */
export type LoginQrPayload = {
  /** Challenge id returned by POST /auth/device-login (the secret). */
  id: string;
};

export const LOGIN_QR_VERSION = 1;

export const LOGIN_QR_TYPE = 'login';

export const LOGIN_CHALLENGE_PATTERN = /^[0-9a-fA-F]{64}$/;

/** Builds the compact JSON that the desktop encodes as a QR code. */
export function buildLoginQr(id: string): string {
  return JSON.stringify({ v: LOGIN_QR_VERSION, t: LOGIN_QR_TYPE, id });
}

/** Parses and validates a scanned device-login QR. `null` if not a login QR. */
export function parseLoginQr(raw: string): LoginQrPayload | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;

  const value = json as Record<string, unknown>;
  if (value.v !== LOGIN_QR_VERSION || value.t !== LOGIN_QR_TYPE) return null;
  if (typeof value.id !== 'string' || !LOGIN_CHALLENGE_PATTERN.test(value.id)) return null;

  return { id: value.id };
}