import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { ScheduleEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { TIMELINE_HOURS } from '@/shared/constants/dashboard.constant';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { cn } from '@/shared/libs/utils';
import { AgendaItem } from './agenda-item';

type ScheduleTimelineProps = {
  entries: readonly ScheduleEntry[];
  hours?: readonly number[];
  onSelect?: (entry: ScheduleEntry) => void;
  onLongPress?: (entry: ScheduleEntry) => void;
  renderContextMenu?: (entry: ScheduleEntry, trigger: ReactElement) => ReactNode;
};

export function ScheduleTimeline({
  entries,
  hours = TIMELINE_HOURS,
  onSelect,
  onLongPress,
  renderContextMenu,
}: ScheduleTimelineProps) {
  const date = useDateFormatter();
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
                    'text-caption font-medium',
                    marked ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                  {date.formatHour(hour)}
                </Text>
              </View>
            </View>
            <View className="flex-1">
              {entry ? (
                <AgendaItem
                  title={entry.title}
                  time={entry.time}
                  note={entry.note}
                  status={entry.status}
                  onPress={onSelect ? () => onSelect(entry) : undefined}
                  onLongPress={onLongPress ? () => onLongPress(entry) : undefined}
                  contextMenu={
                    renderContextMenu ? (trigger) => renderContextMenu(entry, trigger) : undefined
                  }
                />
              ) : (
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
