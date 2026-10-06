import { moduleOfAppRoute } from '@/core/services/modules/module-state';
import { CAPABILITY, type Capability } from '@/shared/constants';
import {
  guardAccessOf,
  hasCapability,
  isModuleActive,
  peopleAccessOf,
  type AccessView,
} from './capabilities';

type RouteFallback = '/' | '/profile';

type RouteRule = {
  allows: (view: AccessView) => boolean;
  fallback: RouteFallback;
};

const ROUTE_RULES: Readonly<Record<string, RouteRule>> = {
  '/settings': { allows: (view) => view.roleActive && hasCapability(view, CAPABILITY.settingsManage), fallback: '/profile' },
  '/users': { allows: (view) => peopleAccessOf(view).profileAction === 'manage', fallback: '/profile' },
  '/people': { allows: (view) => peopleAccessOf(view).profileAction === 'directory', fallback: '/profile' },
  '/security': { allows: (view) => guardAccessOf(view).view, fallback: '/' },
  '/cameras': { allows: (view) => hasCapability(view, CAPABILITY.cameraView), fallback: '/' },
  '/agenda': { allows: (view) => hasCapability(view, CAPABILITY.agendaRead), fallback: '/' },
  '/projects': { allows: (view) => view.roleActive && hasCapability(view, CAPABILITY.projectsRead), fallback: '/' },
};

const EXACT_RULES: Readonly<Record<string, RouteRule>> = {
  '/users/visitors': { allows: (view) => hasCapability(view, CAPABILITY.visitorsRead), fallback: '/' },
  '/settings/activity': { allows: (view) => hasCapability(view, CAPABILITY.activityRead), fallback: '/profile' },
};

const INACTIVE_ROLE_ROUTES: ReadonlySet<string> = new Set(['/', '/profile']);

const INACTIVE_ROLE_CAPABILITY_ROUTES: Readonly<Record<string, Capability>> = {
  '/call': CAPABILITY.callsJoin,
};

const pathOf = (pathname: string): string => pathname.split(/[?#]/)[0] ?? pathname;

function inactiveRoleMayOpen(path: string, view: AccessView): boolean {
  if (INACTIVE_ROLE_ROUTES.has(path)) return true;
  const capability = INACTIVE_ROLE_CAPABILITY_ROUTES[path];
  return capability !== undefined && hasCapability(view, capability);
}

export function routeFallback(pathname: string, view: AccessView): RouteFallback | null {
  const path = pathOf(pathname);
  if (!view.roleActive) return inactiveRoleMayOpen(path, view) ? null : '/';
  const segment = ROUTE_RULES[`/${path.split('/')[1] ?? ''}`];
  const exact = EXACT_RULES[path];
  if (segment && !segment.allows(view)) return segment.fallback;
  if (exact && !exact.allows(view)) return exact.fallback;
  return routeModuleEnabled(path, view) ? null : '/';
}

export function routeModuleEnabled(pathname: string, view: AccessView): boolean {
  const moduleId = moduleOfAppRoute(pathname);
  return moduleId === null || isModuleActive(view, moduleId);
}
