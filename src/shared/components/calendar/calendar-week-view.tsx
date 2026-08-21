import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { WEEK_HOUR_HEIGHT } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { sameDay, startOfDay, timelineHours, weekDays } from '@/shared/libs/calendar';
import { cn } from '@/shared/libs/utils';

type CalendarWeekViewProps = {
  anchor: Date;
  selected: Date;
  entries: readonly CalendarEntry[];
  weekdayLabels: readonly string[];
  formatHour: (hour: number) => string;
  onSelectDay: (date: Date) => void;
  onSelect?: (entry: CalendarEntry) => void;
};

/** Minimum block height so a 15-minute event stays tappable. */
const MIN_BLOCK_HEIGHT = 22;

export function CalendarWeekView({
  anchor,
  selected,
  entries,
  weekdayLabels,
  formatHour,
  onSelectDay,
  onSelect,
}: CalendarWeekViewProps) {
  const bottomInset = useBottomNavInset();
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const hours = useMemo(
    () => timelineHours(entries.map((entry) => new Date(entry.startsAt).getHours())),
    [entries]
  );
  const firstHour = hours[0];
  const gridHeight = hours.length * WEEK_HOUR_HEIGHT;

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    for (const entry of entries) {
      const key = startOfDay(new Date(entry.startsAt)).getTime();
      const list = map.get(key);
      if (list) list.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [entries]);

  function offsetFor(entry: CalendarEntry): { top: number; height: number } {
    const start = new Date(entry.startsAt);
    const minutes = (start.getHours() - firstHour) * 60 + start.getMinutes();
    const durationMinutes = entry.endsAt
      ? Math.max(15, (entry.endsAt - entry.startsAt) / 60_000)
      : 45;
    return {
      top: Math.max(0, (minutes / 60) * WEEK_HOUR_HEIGHT),
      height: Math.max(MIN_BLOCK_HEIGHT, (durationMinutes / 60) * WEEK_HOUR_HEIGHT),
    };
  }

  return (
    <View className="min-h-0 flex-1 gap-2">
      <View className="flex-row">
        <View className="w-12" />
        {days.map((day, index) => {
          const isSelected = sameDay(day, selected);
          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              className="flex-1 items-center gap-1 active:opacity-70"
              onPress={() => onSelectDay(day)}>
              <Text className="text-muted-foreground text-[11px] font-medium capitalize">
                {weekdayLabels[index]}
              </Text>
              <View
                className={cn(
                  'size-7 items-center justify-center rounded-full',
                  isSelected && 'bg-interactive'
                )}>
                <Text
                  className={cn(
                    'text-[13px] font-semibold',
                    isSelected ? 'text-foreground-on-interactive' : 'text-foreground'
                  )}>
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-row" style={{ height: gridHeight }}>
          <View className="w-12">
            {hours.map((hour) => (
              <View key={hour} style={{ height: WEEK_HOUR_HEIGHT }} className="pr-1">
                <Text className="text-muted-foreground text-[10px]">{formatHour(hour)}</Text>
              </View>
            ))}
          </View>
          {days.map((day) => (
            <View key={day.toISOString()} className="border-border-subtle flex-1 border-l">
              {hours.map((hour) => (
                <View
                  key={hour}
                  style={{ height: WEEK_HOUR_HEIGHT }}
                  className="border-border-subtle border-b"
                />
              ))}
              {(byDay.get(day.getTime()) ?? []).map((entry) => {
                const { top, height } = offsetFor(entry);
                return (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={entry.title}
                    style={{ position: 'absolute', top, height, left: 2, right: 2 }}
                    className={cn(
                      'justify-center overflow-hidden rounded-[8px] px-1.5',
                      entry.status === 'complete'
                        ? 'bg-success/20'
                        : entry.source === 'task'
                          ? 'bg-accent-soft'
                          : 'bg-surface-secondary'
                    )}
                    onPress={onSelect ? () => onSelect(entry) : undefined}>
                    <Text className="text-foreground text-[10px] font-semibold" numberOfLines={2}>
                      {entry.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
