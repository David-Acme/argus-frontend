import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { MomentFormat } from '@/features/security/model/moment';

export function useMomentFormat(): MomentFormat {
  const { t } = useTranslation();
  const date = useDateFormatter();
  return { t, time: date.formatTime, day: date.formatWeekdayShort };
}
