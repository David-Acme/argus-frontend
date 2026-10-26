import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import type { DayNames } from '@/features/agenda/model/agenda-view';

export function useDayNames(): DayNames {
  const date = useDateFormatter();
  return {
    letter: (at) => date.formatWeekdayShort(new Date(at)).charAt(0).toLocaleUpperCase(),
    number: (at) => date.formatDayNumber(new Date(at)),
    full: (at) => date.formatFullDate(new Date(at)),
  };
}
