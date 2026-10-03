import { usePathname, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import type { DashboardTab } from '@/core/types';
import { DASHBOARD_TAB_ROUTE } from '@/shared/constants';
import { useTranslation } from './use-translation';

type DashboardNavigation = {
  labels: Record<DashboardTab, string>;
  navigate: (tab: DashboardTab) => void;
};

export function useDashboardNavigation(): DashboardNavigation {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const labels = useMemo(
    () => ({
      home: t('screens.home.home'),
      schedule: t('screens.agenda.schedule'),
      projects: t('screens.projects.title'),
      profile: t('screens.home.profile'),
    }),
    [t],
  );

  const navigate = useCallback(
    (tab: DashboardTab) => {
      const route = DASHBOARD_TAB_ROUTE[tab];
      if (route === pathname) return;
      if (tab === 'home') {
        if (router.canDismiss()) router.dismissTo('/');
        else router.replace('/');
        return;
      }
      if (pathname === '/') router.push(route);
      else router.replace(route);
    },
    [pathname, router],
  );

  return { labels, navigate };
}
