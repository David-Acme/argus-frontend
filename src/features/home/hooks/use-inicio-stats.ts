import { useRouter } from 'expo-router';
import type { DashboardSummary } from '@/core/types';
import { CAPABILITY, EMPTY_DASHBOARD_SUMMARY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { StatusStat } from '@/shared/ui/status';
import { useCameraOverview } from '@/features/cameras';
import {
  dayDetections,
  heroStats,
  type HeroStat,
  type StatPlace,
} from '@/features/home/model/inicio-stats';

const MINUTE_MS = 60_000;

const LABEL_KEYS = {
  cameras: ['screens.home.inicio.stat.cameras-one', 'screens.home.inicio.stat.cameras'],
  alerts: ['screens.home.inicio.stat.alerts-one', 'screens.home.inicio.stat.alerts'],
  detections: ['screens.home.inicio.stat.detections-one', 'screens.home.inicio.stat.detections'],
  pending: ['screens.home.inicio.stat.pending-one', 'screens.home.inicio.stat.pending'],
} as const;

export function useInicioSummary(): DashboardSummary {
  return (
    useViewCacheValue<DashboardSummary>(VIEW_CACHE_KEYS.dashboardSummary) ?? EMPTY_DASHBOARD_SUMMARY
  );
}

export function useInicioStats(place: StatPlace): StatusStat[] {
  const { t } = useTranslation();
  const router = useRouter();
  const { has } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const summary = useInicioSummary();
  const watches = has(CAPABILITY.cameraView);
  const overview = useCameraOverview(watches);
  const today = overview
    ? dayDetections(overview.events, new Date(now).setHours(0, 0, 0, 0))
    : null;
  const stats = heroStats({
    cameras: watches ? summary.camerasTotal : null,
    alerts: watches ? (today?.alerts ?? null) : null,
    detections: watches ? (today?.detections ?? null) : null,
    pending: has(CAPABILITY.remindersRead) ? summary.remindersPending : null,
    place,
  });
  const labelOf = ({ kind, count }: HeroStat) => t(LABEL_KEYS[kind][count === 1 ? 0 : 1]);
  return stats.map((stat) => ({
    value: String(stat.count),
    label: labelOf(stat),
    icon: stat.icon,
    tone: stat.raised ? 'attn' : undefined,
    onPress: () => router.push(stat.href),
  }));
}
