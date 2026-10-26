import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { AgendaScreenState } from '@/features/agenda/hooks/use-agenda-screen';
import { markedDays, monthCells, shiftMonth, weekCells } from '@/features/agenda/model/agenda-days';
import type { DayCell, MonthCell } from '@/features/agenda/model/agenda-days';
import type { MonthShift } from '@/features/agenda/model/agenda-view';

export type CalendarCells = { week: DayCell[]; month: MonthCell[] };

export function useMonthShift(state: AgendaScreenState): MonthShift {
  const { t } = useTranslation();
  const date = useDateFormatter();
  return {
    title: date.formatMonthYear(new Date(state.month)),
    previous: t('screens.agenda.page.previous-month'),
    next: t('screens.agenda.page.next-month'),
    onShift: (step: number) => state.setMonth(shiftMonth(state.month, step, date)),
  };
}

export function useCalendarCells(state: AgendaScreenState): CalendarCells {
  const date = useDateFormatter();
  const input = {
    selected: state.selected,
    now: state.plan.now,
    marks: markedDays(state.visible, date),
  };
  return {
    week: weekCells(input, date),
    month: monthCells(state.month, input, date),
  };
}
