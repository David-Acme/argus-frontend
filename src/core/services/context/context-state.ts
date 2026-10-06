import type { AppAccess, AppContext } from '@/core/types';
import { MODULE_IDS } from '@/shared/constants';

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

export const sameAccess = (left: AppAccess | null, right: AppAccess | null): boolean =>
  left !== null &&
  right !== null &&
  JSON.stringify({ ...left, receivedAt: 0 }) === JSON.stringify({ ...right, receivedAt: 0 });

export const isStaleContext = (previous: AppAccess | null, next: Pick<AppContext, 'userId' | 'version'>): boolean =>
  previous !== null &&
  previous.userId === next.userId &&
  previous.version !== null &&
  next.version !== null &&
  next.version < previous.version;

export const activeModulesOf = (access: AppAccess | null): ReadonlySet<string> | null =>
  access === null
    ? null
    : new Set([MODULE_IDS.core, ...access.modules.filter((module) => module.enabled).map((module) => module.id)]);

export const gainedModules = (before: ReadonlySet<string> | null, after: ReadonlySet<string> | null): string[] =>
  after === null ? [] : [...after].filter((id) => before === null || !before.has(id));

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
