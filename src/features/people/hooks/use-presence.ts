import { useMemo } from 'react';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { presenceService } from '@/features/people/services/presence.service';
import { presenceOf, type PresenceView } from '@/features/people/model/presence';

export type LabelledPresence = PresenceView & { label: string };

const loadPresence = () => presenceService.overview();

export function usePresence(enabled: boolean) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const { data } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.presence,
    load: loadPresence,
    enabled,
  });

  return useMemo(() => {
    const now = new Date();
    return (userId: number): LabelledPresence => {
      const view = presenceOf(data, userId, now);
      const state = t(`screens.users.presence.${view.state}`);
      if (view.since === null) return { ...view, label: state };
      const label =
        view.sinceKind === 'today'
          ? t('screens.users.presence.since-time', { state, time: dates.formatTime(view.since) })
          : t('screens.users.presence.since-day', { state, date: dates.formatDayMonth(view.since) });
      return { ...view, label };
    };
  }, [data, t, dates]);
}
