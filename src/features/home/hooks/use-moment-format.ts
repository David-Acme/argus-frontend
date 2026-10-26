import type { MomentFormat } from '@/features/home/model/camera-moments';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

export function useMomentFormat(): MomentFormat {
  const { t } = useTranslation();
  const date = useDateFormatter();
  return { t, time: date.formatTime, day: date.formatWeekdayShort };
}
