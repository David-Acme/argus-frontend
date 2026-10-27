import type { IPeopleDirectoryCacheRow, IProjectMemberCacheRow } from '@/core/interfaces';
import { shareCandidates } from '@/shared/libs/sharing';

export type ProjectAccess = 'owner' | 'edit' | 'view' | 'none';

export type ProjectAccessInput = {
  ownerId: string;
  userId: string;
  members: readonly Pick<IProjectMemberCacheRow, 'userId' | 'access'>[];
};

export function projectAccessOf({ ownerId, userId, members }: ProjectAccessInput): ProjectAccess {
  if (userId.length === 0) return 'none';
  if (ownerId === userId) return 'owner';
  const member = members.find((candidate) => candidate.userId === userId);
  if (!member) return 'none';
  return member.access === 'edit' ? 'edit' : 'view';
}

export const worksOnProject = (access: ProjectAccess): boolean =>
  access === 'owner' || access === 'edit';

export const ownsProject = (access: ProjectAccess): boolean => access === 'owner';

export type MemberCandidateInput = {
  ownerId: string;
  members: readonly Pick<IProjectMemberCacheRow, 'userId'>[];
  people: readonly IPeopleDirectoryCacheRow[];
};

export function memberCandidates({
  ownerId,
  members,
  people,
}: MemberCandidateInput): IPeopleDirectoryCacheRow[] {
  return shareCandidates({ table: 'project', ownerId, shared: members, people });
}
