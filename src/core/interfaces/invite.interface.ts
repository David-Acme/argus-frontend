import type { InviteRole, UserRole } from '@/core/types';

export interface IInviteCreateInput {
  role: InviteRole;
}

export interface IInviteCreated {
  id: number;
  token: string;
  role: InviteRole;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt: number;
  createdBy: number;
  revokedAt: number | null;
  createdAt: number;
}

export type IInvitationRecord = Omit<IInviteCreated, 'token'>;

export interface IInviteAcceptResult {
  instanceId: string;
  caFingerprint: string;
  serverFingerprint: string;
  caPem: string;
  scheme: string;
  port: number;
  role: InviteRole;
  expiresAt: number;
}

export interface IUserManagementRecord {
  id: number;
  name: string;
  lastName: string;
  role: UserRole;
  lang: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number | null;
  deletedAt: number | null;
}

export interface IUserManagementUpdate {
  name?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}
