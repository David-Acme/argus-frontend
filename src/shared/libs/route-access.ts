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

export function routeFallback(pathname: string, role: UserRole): RouteRule['fallback'] | null {
  const rule = ROUTE_RULES[pathname];
  return rule && !rule.allows(role) ? rule.fallback : null;
}
