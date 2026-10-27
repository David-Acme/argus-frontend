import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { ThreadDays } from '@/features/conversations/components/thread-list';
import { dayKindOf } from '@/features/conversations/model/conversation-thread';

export function useThreadDays(now: number): ThreadDays {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const today = date.startOfDay(new Date(now));
  const todayStart = today.getTime();
  const yesterdayStart = date.addDays(today, -1).getTime();
  return {
    startOfDay: (at) => date.startOfDay(new Date(at)).getTime(),
    dayLabel: (day) => {
      const kind = dayKindOf(day, todayStart, yesterdayStart);
      if (kind === 'today') return t('screens.conversations.today');
      if (kind === 'yesterday') return t('screens.conversations.yesterday');
      if (kind === 'weekday') return date.formatWeekday(new Date(day));
      return date.formatDayMonth(new Date(day));
    },
  };
}
