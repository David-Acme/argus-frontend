import type {
  IInvitationRecord,
  IPeopleDirectoryCacheRow,
  IUserManagementUpdate,
} from '@/core/interfaces';
import { defineLens, type OptimisticLens } from '@/shared/libs/optimistic';

export const USER_LENSES: readonly OptimisticLens<IPeopleDirectoryCacheRow>[] = [
  defineLens<IPeopleDirectoryCacheRow, IUserManagementUpdate>({
    table: 'user',
    recordIdOf: (row) => row.id,
    patch: (row, values) => ({
      ...row,
      name: values.name ?? row.name,
      lastName: values.lastName ?? row.lastName,
      role: values.role ?? row.role,
      isActive: values.isActive ?? row.isActive,
    }),
  }),
];

export const INVITATION_LENSES: readonly OptimisticLens<IInvitationRecord>[] = [
  defineLens<IInvitationRecord, { revokedAt: number }>({
    table: 'user_invitation',
    recordIdOf: (row) => String(row.id),
    patch: (row, values) => ({ ...row, revokedAt: row.revokedAt ?? values.revokedAt ?? null }),
  }),
];

export type InvitationState = 'waiting' | 'used' | 'closed' | 'lapsed';

type InvitationLifecycle = Pick<
  IInvitationRecord,
  'revokedAt' | 'expiresAt' | 'redemptionCount' | 'maxRedemptions'
>;

export function invitationStateOf(invitation: InvitationLifecycle, nowMs: number): InvitationState {
  if (invitation.redemptionCount >= invitation.maxRedemptions) return 'used';
  if (invitation.revokedAt != null) return 'closed';
  if (invitation.expiresAt * 1000 <= nowMs) return 'lapsed';
  return 'waiting';
}

export type InvitationClosing = {
  reason: 'module';
  moduleId: string;
};

export function invitationClosingOf(
  invitation: Pick<IInvitationRecord, 'revokedAt' | 'revokedReason' | 'revokedModule'>
): InvitationClosing | null {
  if (invitation.revokedAt == null || invitation.revokedReason !== 'module_disabled' || !invitation.revokedModule) return null;
  return { reason: 'module', moduleId: invitation.revokedModule };
}

export function isInvitationUsable(invitation: IInvitationRecord, nowMs: number): boolean {
  return invitationStateOf(invitation, nowMs) === 'waiting';
}
