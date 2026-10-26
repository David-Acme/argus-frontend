import type { DashboardSummary } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';

export type CameraCounts = { online: number; total: number };

export function useCameraCounts(): CameraCounts | null {
  const summary = useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary);
  if (!summary || summary.camerasTotal === 0) return null;
  return { online: summary.camerasOnline, total: summary.camerasTotal };
}
