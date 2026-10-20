import type { AccessView } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';

export type HeldRoute = { path: string | null };

export function holdRoute(holder: HeldRoute, pathname: string): void {
  if (pathname !== '/' && pathname !== '') holder.path = pathname;
}

export function routeToRestore(holder: HeldRoute, pathname: string, view: AccessView): string | null {
  const held = holder.path;
  if (held === null || !view.ready) return null;
  holder.path = null;
  if (pathname !== '/' || routeFallback(held, view) !== null) return null;
  return held;
}
