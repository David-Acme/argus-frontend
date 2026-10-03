export type InviteRole = 'resident' | 'guard' | 'guest';

export type InvitationQrPayload = {
  token: string;
  host: string;
  ip: string;
  port: number;
  scheme: 'https';
  instanceId: string;
  caFingerprint: string;
};
