import type { UserInvitationModel, UserModel } from '@/core/database';
import type { IInvitationRecord, IPeopleDirectoryCacheRow, IPeopleDirectoryFilter } from '@/core/interfaces';
import { VIEW_CACHE_KEYS, VIEW_CACHE_LIST_LIMIT } from '@/shared/constants/cache.constant';
import type { ViewWrite } from './projection';

export type UserSource = Pick<UserModel, 'id' | 'name' | 'lastName' | 'role' | 'isActive' | 'createdAt' | 'updatedAt'>;

export type InvitationSource = Pick<
  UserInvitationModel,
  'id' | 'role' | 'maxRedemptions' | 'redemptionCount' | 'expiresAt' | 'createdBy' | 'revokedAt' | 'createdAt'
>;

export type PeopleProjectionInput = {
  users: readonly UserSource[];
  invitations: readonly InvitationSource[];
};

const toSeconds = (value: Date): number => Math.floor(value.getTime() / 1000);

export function projectPeople({ users, invitations }: PeopleProjectionInput): ViewWrite[] {
  const people: IPeopleDirectoryCacheRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  }));
  const invitationRows: IInvitationRecord[] = invitations.map((invitation) => ({
    id: Number(invitation.id),
    role: invitation.role,
    maxRedemptions: invitation.maxRedemptions,
    redemptionCount: invitation.redemptionCount,
    expiresAt: toSeconds(invitation.expiresAt),
    createdBy: Number(invitation.createdBy),
    revokedAt: invitation.revokedAt ? toSeconds(invitation.revokedAt) : null,
    createdAt: toSeconds(invitation.createdAt),
  }));
  return [
    { key: VIEW_CACHE_KEYS.peopleUsers, rows: people, limit: VIEW_CACHE_LIST_LIMIT },
    { key: VIEW_CACHE_KEYS.peopleInvitations, rows: invitationRows, limit: VIEW_CACHE_LIST_LIMIT },
  ];
}

export function filterPeople(
  rows: readonly IPeopleDirectoryCacheRow[],
  filter: IPeopleDirectoryFilter,
): readonly IPeopleDirectoryCacheRow[] {
  const query = filter.query.trim().toLocaleLowerCase();
  if (!query && filter.role === 'all') return rows;
  return rows.filter((row) => {
    if (filter.role !== 'all' && row.role !== filter.role) return false;
    if (!query) return true;
    return `${row.name} ${row.lastName}`.toLocaleLowerCase().includes(query) || row.role.includes(query);
  });
}
