import { usePathname, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useAuthStore } from '@/core/stores';
import type { DashboardTab } from '@/core/types';
import { DASHBOARD_TABS, DASHBOARD_TAB_ROUTE } from '@/shared/constants';
import { peopleAccessForRole } from '@/shared/libs/people-access';
import { routeFallback } from '@/shared/libs/route-access';
import { usePermissions } from './use-permissions';
import { useTranslation } from './use-translation';

type DashboardNavigation = {
  tabs: typeof DASHBOARD_TABS;
  labels: Record<DashboardTab, string>;
  navigate: (tab: DashboardTab) => void;
};

export function useDashboardNavigation(): DashboardNavigation {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { canRead } = usePermissions();
  const role = useAuthStore((state) => state.user?.role) ?? 'guest';
  const peopleAction = peopleAccessForRole(role).profileAction;

  const routeOf = useCallback(
    (tab: DashboardTab) => (tab === 'people' && peopleAction === 'manage' ? '/users' : DASHBOARD_TAB_ROUTE[tab]),
    [peopleAction]
  );

  const tabs = useMemo(
    () =>
      DASHBOARD_TABS.filter(
        (item) => (!item.table || canRead(item.table)) && routeFallback(routeOf(item.tab), role) === null
      ),
    [canRead, role, routeOf]
  );

  const labels = useMemo(
    () => ({
      home: t('screens.home.home'),
      schedule: t('screens.agenda.schedule'),
      projects: t('screens.projects.title'),
      people: t('screens.profile.people'),
      settings: t('screens.settings.title'),
      profile: t('screens.home.profile'),
    }),
    [t],
  );

  const navigate = useCallback(
    (tab: DashboardTab) => {
      const route = routeOf(tab);
      if (route === pathname) return;
      if (tab === 'home') {
        if (router.canDismiss()) router.dismissTo('/');
        else router.replace('/');
        return;
      }
      if (pathname === '/') router.push(route);
      else router.replace(route);
    },
    [pathname, routeOf, router],
  );

  return { tabs, labels, navigate };
}
