import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { RESULT_DAY_KEYS } from '@/features/voice/constants/result.constant';
import { resultDayOf } from '@/features/voice/model/result-day';

export type ResultWhen = {
  dayOf: (at: number) => string;
  whenOf: (at: number) => string;
  rangeOf: (startsAt: number, endsAt: number | null) => string;
  timeOf: (at: number) => string;
};

export function useResultWhen(now: number): ResultWhen {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const startOfDay = (at: number) => date.startOfDay(new Date(at)).getTime();

  const dayOf = (at: number): string => {
    const day = resultDayOf({ at, now, startOfDay });
    if (day !== 'other') return t(RESULT_DAY_KEYS[day]);
    const value = new Date(at);
    return t('screens.voice.results.day', {
      weekday: date.formatWeekday(value),
      day: date.formatDayNumber(value),
    });
  };

  const timeOf = (at: number): string => date.formatTime(new Date(at));

  return {
    dayOf,
    timeOf,
    whenOf: (at) => t('screens.voice.results.when', { day: dayOf(at), time: timeOf(at) }),
    rangeOf: (startsAt, endsAt) =>
      t('screens.voice.results.when', {
        day: dayOf(startsAt),
        time: date.formatTimeRange(new Date(startsAt), endsAt === null ? null : new Date(endsAt)),
      }),
  };
}
