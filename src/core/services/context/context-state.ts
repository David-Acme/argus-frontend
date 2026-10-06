import type { AppAccess, AppContext } from '@/core/types';

export const accessOf = (context: AppContext, now: number): AppAccess => ({
  userId: context.userId,
  role: context.role,
  roleActive: context.roleActive,
  capabilities: context.capabilities,
  roles: context.roles,
  modules: context.modules,
  version: context.version,
  receivedAt: now,
});

export const isStaleContext = (previous: AppAccess | null, next: Pick<AppContext, 'userId' | 'version'>): boolean =>
  previous !== null &&
  previous.userId === next.userId &&
  previous.version !== null &&
  next.version !== null &&
  next.version < previous.version;

export const belongsTo = (session: string, context: Pick<AppContext, 'userId'>): boolean =>
  String(context.userId) === session;

export function withModuleOff(access: AppAccess | null, moduleId: string): AppAccess | null {
  if (!access) return access;
  if (!access.modules.some((module) => module.id === moduleId && module.enabled)) return access;
  return {
    ...access,
    modules: access.modules.map((module) =>
      module.id === moduleId
        ? { ...module, enabled: false, lifecycle: module.lifecycle === 'active' ? 'disabled' : module.lifecycle }
        : module
    ),
  };
}
