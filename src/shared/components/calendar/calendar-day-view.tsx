import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import type { CalendarEntry, ScheduleEntry } from '@/core/types';
import { ScheduleTimeline } from '@/shared/components/dashboard';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { timelineHours } from '@/shared/libs/calendar';

type CalendarDayViewProps = {
  entries: readonly CalendarEntry[];
  formatHour: (hour: number) => string;
  formatTime: (entry: CalendarEntry) => string;
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
};

/** Reuses the schedule timeline: one day is exactly what it was built for. */
export function CalendarDayView({
  entries,
  formatHour,
  formatTime,
  onSelect,
  onLongPress,
}: CalendarDayViewProps) {
  const bottomInset = useBottomNavInset();
  const rows = useMemo<ScheduleEntry[]>(
    () =>
      entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        time: formatTime(entry),
        hour: new Date(entry.startsAt).getHours(),
        status: entry.status,
        members: [],
      })),
    [entries, formatTime]
  );

  const hours = useMemo(() => timelineHours(rows.map((row) => row.hour)), [rows]);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: bottomInset }}
      showsVerticalScrollIndicator={false}>
      <ScheduleTimeline
      entries={rows}
      formatHour={formatHour}
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
      />
    </ScrollView>
  );
}
