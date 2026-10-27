import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { useAccessView } from '@/shared/hooks/use-capabilities';
import {
  holdRoute,
  routeToRestore,
  type HeldRoute,
  type RouteParams,
} from '@/features/auth/model/held-route';

const requested: HeldRoute = { path: null };

export function holdRequestedRoute(pathname: string, params?: RouteParams): void {
  holdRoute(requested, pathname, params);
}

export function forgetRequestedRoute(): void {
  requested.path = null;
}

export function useDeepLinkRestore(): void {
  const router = useRouter();
  const pathname = usePathname();
  const view = useAccessView();

  useEffect(() => {
    const target = routeToRestore(requested, pathname, view);
    if (target) router.replace(target as Href);
  }, [pathname, router, view]);
}
