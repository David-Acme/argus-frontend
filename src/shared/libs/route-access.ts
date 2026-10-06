import { moduleOfAppRoute } from '@/core/services/modules/module-state';
import { CAPABILITY } from '@/shared/constants';
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
};

const INACTIVE_ROLE_ROUTES: ReadonlySet<string> = new Set(['/', '/profile']);

const pathOf = (pathname: string): string => pathname.split(/[?#]/)[0] ?? pathname;

export function routeFallback(pathname: string, view: AccessView): RouteFallback | null {
  const path = pathOf(pathname);
  if (!view.roleActive) return INACTIVE_ROLE_ROUTES.has(path) ? null : '/';
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
