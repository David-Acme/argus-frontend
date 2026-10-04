import type { IInviteAcceptResult } from '@/core/interfaces';
import type { InvitationQrPayload, InviteRole, NetHttpRequest, NetPin } from '@/core/types';

const RESOLVE_PATH = '/invitation/resolve';

const INVITE_ROLES: readonly InviteRole[] = ['resident', 'guard', 'guest'];
const FINGERPRINT_PATTERN = /^[0-9A-Fa-f]{64}$/;

const isInviteRole = (value: unknown): value is InviteRole =>
  typeof value === 'string' && INVITE_ROLES.includes(value as InviteRole);

const sameFingerprint = (left: string, right: string): boolean =>
  left.toUpperCase() === right.toUpperCase();

export const validateInvitationResolution = (
  qr: InvitationQrPayload,
  value: unknown,
): IInviteAcceptResult | null => {
  if (!value || typeof value !== 'object') return null;
  const result = value as Record<string, unknown>;
  if (
    !isInviteRole(result.role) ||
    typeof result.expiresAt !== 'number' ||
    !Number.isInteger(result.expiresAt) ||
    typeof result.instanceId !== 'string' ||
    !FINGERPRINT_PATTERN.test(result.instanceId) ||
    typeof result.caFingerprint !== 'string' ||
    !FINGERPRINT_PATTERN.test(result.caFingerprint) ||
    typeof result.serverFingerprint !== 'string' ||
    !FINGERPRINT_PATTERN.test(result.serverFingerprint) ||
    typeof result.caPem !== 'string' ||
    !result.caPem.includes('BEGIN CERTIFICATE') ||
    result.scheme !== 'https' ||
    typeof result.port !== 'number' ||
    !Number.isInteger(result.port) ||
    result.port !== qr.port ||
    !sameFingerprint(result.instanceId, qr.instanceId) ||
    !sameFingerprint(result.caFingerprint, qr.caFingerprint)
  ) {
    return null;
  }

  return {
    role: result.role,
    expiresAt: result.expiresAt,
    instanceId: result.instanceId,
    caFingerprint: result.caFingerprint,
    serverFingerprint: result.serverFingerprint,
    caPem: result.caPem,
    scheme: result.scheme,
    port: result.port,
  };
};

export const invitationResolveRequest = (qr: InvitationQrPayload): { request: NetHttpRequest; pin: NetPin } => ({
  request: {
    url: `https://${qr.ip}:${qr.port}${RESOLVE_PATH}`,
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: qr.token }),
  },
  pin: { caFingerprint: qr.caFingerprint, host: qr.host },
});
