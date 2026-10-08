import type { IDashboardCacheData, ICameraCacheRow } from '@/core/interfaces';
import type { CalendarEntry, DashboardProjectCard, DashboardSummary } from '@/core/types';
import { EMPTY_DASHBOARD_SUMMARY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from '@/shared/hooks/use-cached-rows';

export function useDashboardData(): IDashboardCacheData {
  const cameraTiles = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const projects = useViewCacheRows<DashboardProjectCard>(VIEW_CACHE_KEYS.dashboardProjects);
  const today = useViewCacheRows<CalendarEntry>(VIEW_CACHE_KEYS.dashboardAgenda, 'today');
  const unreadNotifications = useViewCacheValue<number>(VIEW_CACHE_KEYS.dashboardUnread) ?? 0;
  const summary =
    useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary) ?? EMPTY_DASHBOARD_SUMMARY;

  return {
    cameraTiles,
    projects,
    today,
    unreadNotifications,
    summary,
  };
}
