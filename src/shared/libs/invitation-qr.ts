import type { InvitationQrPayload } from '@/core/types';
import {
  PAIRING_FINGERPRINT_PATTERN,
  PAIRING_HOST_SUFFIX,
} from '@/shared/constants/pairing.constant';

const INVITATION_QR_VERSION = 1;
const INVITATION_QR_TYPE = 'invite';
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;

const isIpv4 = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
  );
};

export const buildInvitationQr = (payload: InvitationQrPayload): string =>
  JSON.stringify({ v: INVITATION_QR_VERSION, t: INVITATION_QR_TYPE, ...payload });

export const parseInvitationQr = (raw: string): InvitationQrPayload | null => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;

  const value = json as Record<string, unknown>;
  if (value.v !== INVITATION_QR_VERSION || value.t !== INVITATION_QR_TYPE) return null;
  if (typeof value.token !== 'string' || !INVITATION_TOKEN_PATTERN.test(value.token)) return null;
  if (typeof value.host !== 'string' || !value.host.endsWith(PAIRING_HOST_SUFFIX)) return null;
  if (!isIpv4(value.ip)) return null;
  if (typeof value.port !== 'number' || !Number.isInteger(value.port) || value.port <= 0 || value.port > 65535) {
    return null;
  }
  if (value.scheme !== 'https') return null;
  if (
    typeof value.instanceId !== 'string' ||
    !PAIRING_FINGERPRINT_PATTERN.test(value.instanceId) ||
    typeof value.caFingerprint !== 'string' ||
    !PAIRING_FINGERPRINT_PATTERN.test(value.caFingerprint)
  ) {
    return null;
  }

  return {
    token: value.token,
    host: value.host,
    ip: value.ip,
    port: value.port,
    scheme: value.scheme,
    instanceId: value.instanceId,
    caFingerprint: value.caFingerprint,
  };
};
