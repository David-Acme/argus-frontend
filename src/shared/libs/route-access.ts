import { isModuleEnabled, moduleOfAppRoute } from '@/core/services/modules/module-state';
import type { UserRole } from '@/core/types';
import { peopleAccessForRole } from './people-access';
import { guardAccessForRole } from './role-access';

type RouteRule = {
  allows: (role: UserRole) => boolean;
  fallback: '/' | '/profile';
};

const ROUTE_RULES: Readonly<Record<string, RouteRule>> = {
  '/settings': { allows: (role) => role === 'owner', fallback: '/profile' },
  '/users': { allows: (role) => peopleAccessForRole(role).profileAction === 'manage', fallback: '/profile' },
  '/people': { allows: (role) => peopleAccessForRole(role).profileAction === 'directory', fallback: '/profile' },
  '/security': { allows: (role) => guardAccessForRole(role).view, fallback: '/' },
};

export function routeFallback(
  pathname: string,
  role: UserRole,
  enabledModules: ReadonlySet<string> | null = null
): RouteRule['fallback'] | null {
  const rule = ROUTE_RULES[pathname] ?? ROUTE_RULES[`/${pathname.split('/')[1] ?? ''}`];
  if (rule && !rule.allows(role)) return rule.fallback;
  return routeModuleEnabled(pathname, enabledModules) ? null : '/';
}

export function routeModuleEnabled(pathname: string, enabledModules: ReadonlySet<string> | null): boolean {
  const moduleId = moduleOfAppRoute(pathname);
  return moduleId === null || isModuleEnabled(enabledModules, moduleId);
}
