import { useCallback } from 'react';
import type { AuthSession } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { activityOf } from '@/features/settings/model/sessions';

export function useSessionLabels(now: number) {
  const { t } = useTranslation();
  const dates = useDateFormatter();

  const dayOf = useCallback(
    (seconds: number) => {
      const date = new Date(seconds * 1000);
      const sameYear = date.getFullYear() === new Date(now * 1000).getFullYear();
      return sameYear
        ? dates.formatDayMonth(date)
        : `${dates.formatDayMonth(date)} ${dates.formatYear(date)}`;
    },
    [dates, now]
  );

  const nameOf = useCallback(
    (session: AuthSession) =>
      session.deviceName ?? t(`screens.sessions.fallback-name.${session.platform}`),
    [t]
  );

  const platformOf = useCallback(
    (session: AuthSession) => t(`screens.sessions.platform.${session.platform}`),
    [t]
  );

  const activityLabel = useCallback(
    (session: AuthSession) => {
      if (session.current) return t('screens.sessions.activity.now');
      const activity = activityOf(session.lastSeenAt, now);
      if (activity.kind === 'now') return t('screens.sessions.activity.now');
      if (activity.kind === 'date')
        return t('screens.sessions.activity.date', { date: dayOf(session.lastSeenAt) });
      return t(`screens.sessions.activity.${activity.kind}`, { count: String(activity.count) });
    },
    [dayOf, now, t]
  );

  const sinceLabel = useCallback(
    (session: AuthSession) => t('screens.sessions.since', { date: dayOf(session.createdAt) }),
    [dayOf, t]
  );

  return { nameOf, platformOf, activityLabel, sinceLabel };
}
