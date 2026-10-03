import type { IInvitationRecord, IPeopleDirectoryCacheRow, IUserManagementUpdate } from '@/core/interfaces';
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

export function isInvitationUsable(invitation: IInvitationRecord, nowMs: number): boolean {
  return (
    invitation.revokedAt == null &&
    invitation.expiresAt * 1000 > nowMs &&
    invitation.redemptionCount < invitation.maxRedemptions
  );
}
