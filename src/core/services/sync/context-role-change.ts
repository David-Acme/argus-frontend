import { readContext } from '@/core/contracts/context.contract';
import type { UserRole } from '@/core/types';

export type StoredRole = {
  id: number;
  role: UserRole;
};

export const contextRoleChange = (info: unknown, stored: StoredRole | null): StoredRole | null => {
  if (!stored) return null;
  const context = readContext(info);
  if (!context || context.userId !== stored.id) return null;
  if (context.role === null || context.role === stored.role) return null;
  return { id: context.userId, role: context.role };
};
