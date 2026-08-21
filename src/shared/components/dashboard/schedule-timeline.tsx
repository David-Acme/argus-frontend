import { View } from 'react-native';
import type { ScheduleEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { TIMELINE_HOURS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';
import { AgendaItem } from './agenda-item';

type ScheduleTimelineProps = {
  entries: readonly ScheduleEntry[];
  /** Formats an hour of the day for the gutter, e.g. 9 → "9 AM". */
  formatHour: (hour: number) => string;
  /** Hour range to render; defaults to the working span. */
  hours?: readonly number[];
  onSelect?: (entry: ScheduleEntry) => void;
};

/** Hour gutter on the left, one card per occupied hour on the right. */
export function ScheduleTimeline({
  entries,
  formatHour,
  hours = TIMELINE_HOURS,
  onSelect,
}: ScheduleTimelineProps) {
  const firstHour = entries.length > 0 ? entries[0].hour : hours[0];

  return (
    <View className="gap-2.5">
      {hours.map((hour) => {
        const entry = entries.find((candidate) => candidate.hour === hour);
        const marked = hour === firstHour;
        return (
          <View key={hour} className="flex-row items-start gap-3">
            <View className="w-16 items-start pt-1.5">
              <View
                className={cn(
                  'rounded-full px-2 py-1',
                  marked ? 'bg-card shadow-sm shadow-black/[0.08]' : 'bg-transparent'
                )}>
                <Text
                  className={cn(
                    'text-[13px] font-medium',
                    marked ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                  {formatHour(hour)}
                </Text>
              </View>
            </View>
            <View className="flex-1">
              {entry ? (
                <AgendaItem
                  title={entry.title}
                  time={entry.time}
                  members={entry.members}
                  note={entry.note}
                  status={entry.status}
                  onPress={onSelect ? () => onSelect(entry) : undefined}
                />
              ) : (
                // A hairline keeps an empty hour reading as a schedule row.
                <View className="h-6 justify-center">
                  <View className="bg-divider/70 h-hairline w-full" />
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
