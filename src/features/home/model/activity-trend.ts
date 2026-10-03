import type { DashboardSummary } from '@/core/types';

export type ActivityTrend = {
  label: string;
  direction: 'up' | 'down' | 'flat';
};

export function activityTrend(
  summary: Pick<DashboardSummary, 'eventsCurrent' | 'eventsPrevious'>,
  locale: string,
): ActivityTrend {
  const { eventsCurrent, eventsPrevious } = summary;
  if (eventsCurrent === eventsPrevious) return { label: String(eventsCurrent), direction: 'flat' };
  if (eventsPrevious === 0) return { label: `+${eventsCurrent}`, direction: 'up' };
  const change = (eventsCurrent - eventsPrevious) / eventsPrevious;
  const magnitude = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
    Math.abs(change),
  );
  return { label: `${change > 0 ? '+' : '-'}${magnitude}`, direction: change > 0 ? 'up' : 'down' };
}
