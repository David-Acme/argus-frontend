import type {
  IDashboardCacheData,
  ICameraCacheRow,
  INotificationPreviewCacheRow,
} from '@/core/interfaces';
import type { CalendarEntry, DashboardProjectCard, DashboardSummary } from '@/core/types';
import {
  EMPTY_DASHBOARD_SUMMARY,
  MOSAIC_COLUMNS,
  MOSAIC_ROWS,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { useViewCacheRows, useViewCacheValue } from './use-cached-rows';

const emptyActivityLevels = (): readonly (readonly number[])[] =>
  Array.from({ length: MOSAIC_ROWS }, () => Array.from({ length: MOSAIC_COLUMNS }, () => 0));

export function useDashboardData(): IDashboardCacheData {
  const cameraTiles = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const projects = useViewCacheRows<DashboardProjectCard>(VIEW_CACHE_KEYS.dashboardProjects);
  const today = useViewCacheRows<CalendarEntry>(VIEW_CACHE_KEYS.dashboardAgenda, 'today');
  const notifications = useViewCacheRows<INotificationPreviewCacheRow>(
    VIEW_CACHE_KEYS.dashboardNotifications,
  );
  const unreadNotifications = useViewCacheValue<number>(VIEW_CACHE_KEYS.dashboardUnread) ?? 0;
  const summary =
    useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary) ?? EMPTY_DASHBOARD_SUMMARY;
  const activityLevels = useViewCacheRows<readonly number[]>(VIEW_CACHE_KEYS.dashboardActivity);

  return {
    cameraTiles,
    projects,
    today,
    notifications,
    unreadNotifications,
    summary,
    activityLevels: activityLevels.length > 0 ? activityLevels : emptyActivityLevels(),
  };
}
