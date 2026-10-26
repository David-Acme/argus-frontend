import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useCommandLauncher } from '@/features/command';
import type { AgendaScreenState } from '@/features/agenda/hooks/use-agenda-screen';
import { useCalendarCells, useMonthShift } from '@/features/agenda/hooks/use-calendar-cells';
import { useDayNames } from '@/features/agenda/hooks/use-day-names';
import { dayRange } from '@/features/agenda/model/agenda-days';
import { AgendaList } from '@/features/agenda/components/agenda-list';
import { AgendaTop } from '@/features/agenda/components/agenda-top';
import { DayEmpty } from '@/features/agenda/components/day-empty';
import { DayView } from '@/features/agenda/components/day-view';
import { WeekStrip } from '@/features/agenda/components/week-strip';

export type AgendaBodyProps = { state: AgendaScreenState };

export function AgendaHead({ state }: AgendaBodyProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const command = useCommandLauncher();
  const names = useDayNames();
  const cells = useCalendarCells(state);
  const shift = useMonthShift(state);
  return (
    <>
      <AgendaTop
        month={date.formatMonth(new Date(state.selected))}
        expanded={state.expanded}
        view={state.view}
        onToggleMonth={state.toggleMonth}
        onView={state.setView}
        onSearch={() => command.open()}
        onProjects={state.openProjects}
      />
      <WeekStrip
        week={cells.week}
        month={cells.month}
        names={names}
        expanded={state.expanded}
        toggleLabel={t(
          state.expanded ? 'screens.agenda.page.month-close' : 'screens.agenda.page.month-open'
        )}
        shift={shift}
        onToggle={state.toggleMonth}
        onPick={(at) => {
          state.pick(at);
          if (state.expanded) state.toggleMonth();
        }}
      />
    </>
  );
}

export function AgendaBody({ state }: AgendaBodyProps) {
  const date = useDateFormatter();
  const { context } = state;
  const [first] = state.kinds;
  const empty = (
    <DayEmpty
      today={date.sameDay(new Date(state.selected), new Date(state.plan.now))}
      onCreate={first ? () => state.create(first) : undefined}
    />
  );
  if (state.view === 'day') {
    const range = dayRange(state.selected, date);
    return (
      <DayView
        items={state.visible.filter(
          (item) => item.startsAt >= range.from && item.startsAt <= range.to
        )}
        range={range}
        context={context}
        empty={empty}
      />
    );
  }
  return <AgendaList groups={state.groups} context={context} empty={empty} />;
}
