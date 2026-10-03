import { useMemo, type ReactElement, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import type { CalendarEntry, ScheduleEntry } from '@/core/types';
import { ScheduleTimeline } from '@/features/agenda/components/schedule-timeline';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

type CalendarDayViewProps = {
  entries: readonly CalendarEntry[];
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
};

export function CalendarDayView({
  entries,
  onSelect,
  onLongPress,
  renderContextMenu,
}: CalendarDayViewProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const rows = useMemo<ScheduleEntry[]>(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        time: entry.isAllDay
          ? t('screens.agenda.event-all-day')
          : date.formatTimeRange(
              new Date(entry.startsAt),
              entry.endsAt ? new Date(entry.endsAt) : null
            ),
        hour: date.hourOf(new Date(entry.startsAt)),
        status: entry.status,
      })),
    [date, entries, t]
  );

  const hours = useMemo(() => date.timelineHours(rows.map((row) => row.hour)), [date, rows]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: bottomInset }}
      showsVerticalScrollIndicator={false}>
      <ScheduleTimeline
        entries={rows}
        hours={hours}
        onSelect={
          onSelect
            ? (row) => {
                const match = entries.find((entry) => entry.id === row.id);
                if (match) onSelect(match);
              }
            : undefined
        }
        onLongPress={
          onLongPress
            ? (row) => {
                const match = entries.find((entry) => entry.id === row.id);
                if (match) onLongPress(match);
            }
          : undefined
        }
        renderContextMenu={
          renderContextMenu
            ? (row, trigger) => {
                const match = entries.find((entry) => entry.id === row.id);
                return match ? renderContextMenu(match, trigger) : trigger;
              }
            : undefined
        }
      />
    </ScrollView>
  );
}
