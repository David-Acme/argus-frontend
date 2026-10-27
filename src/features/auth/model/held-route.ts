import type { AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';

export type HeldRoute = { path: string | null };

export type RouteParams = Readonly<Record<string, string | string[] | undefined>>;

export function hrefOf(pathname: string, params: RouteParams = {}): string {
  const segments = new Set(pathname.split('/').filter(Boolean).map(decodeURIComponent));
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      if (!segments.has(item)) query.append(key, item);
    }
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function holdRoute(holder: HeldRoute, pathname: string, params: RouteParams = {}): void {
  if (pathname !== '/' && pathname !== '') holder.path = hrefOf(pathname, params);
}

export function routeToRestore(
  holder: HeldRoute,
  pathname: string,
  view: AccessView
): string | null {
  const held = holder.path;
  if (held === null || !view.ready) return null;
  holder.path = null;
  if (pathname !== '/' || routeFallback(held, view) !== null) return null;
  return held;
}
