import type { InviteRole } from '@/core/types';

export interface IInviteCreateInput {
  role: InviteRole;
  name?: string;
}

export interface IInviteCreated {
  code: string;
  role: string;
  expiresAt: number;
}

export interface IInviteAcceptResult {
  instanceId: string;
  caFingerprint: string;
  serverFingerprint: string;
  caPem: string;
  scheme: string;
  port: number;
  role: string;
  name?: string | null;
}
