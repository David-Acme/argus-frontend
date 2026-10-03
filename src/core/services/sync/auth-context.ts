import type { UserRole } from '@/core/types';

type AuthContextUser = {
  id: number;
  name: string;
  role: UserRole;
  isActive: boolean;
};

export type AuthContext = {
  user: AuthContextUser;
  requiresResync: boolean;
};

const USER_ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && USER_ROLES.includes(value as UserRole);

export const parseAuthContext = (value: unknown, expectedUserId: number): AuthContext | null => {
  if (!value || typeof value !== 'object') return null;
  const context = value as Record<string, unknown>;
  if (
    context.id !== expectedUserId ||
    typeof context.name !== 'string' ||
    !isUserRole(context.role) ||
    typeof context.isActive !== 'boolean'
  ) {
    return null;
  }

  return {
    user: {
      id: context.id,
      name: context.name,
      role: context.role,
      isActive: context.isActive,
    },
    requiresResync: context.resync === true && context.isActive,
  };
};
