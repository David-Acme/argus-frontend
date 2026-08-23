export type InviteRole = 'resident' | 'guard' | 'guest';

/** Public data encoded in an invitation QR. It contains no session or storage secret. */
export type InvitationQrPayload = {
  token: string;
  host: string;
  ip: string;
  port: number;
  scheme: 'https';
  instanceId: string;
  caFingerprint: string;
};
