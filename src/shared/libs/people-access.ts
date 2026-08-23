import type { UserRole } from '@/core/types';

export type PeopleProfileAction = 'manage' | 'directory' | null;

export type PeopleAccess = {
  profileAction: PeopleProfileAction;
  receivesDirectory: boolean;
  receivesInvitations: boolean;
};

export function peopleAccessForRole(role: UserRole): PeopleAccess {
  if (role === 'owner') {
    return { profileAction: 'manage', receivesDirectory: true, receivesInvitations: true };
  }
  if (role === 'guard') {
    return { profileAction: 'directory', receivesDirectory: true, receivesInvitations: false };
  }
  return { profileAction: null, receivesDirectory: false, receivesInvitations: false };
}
