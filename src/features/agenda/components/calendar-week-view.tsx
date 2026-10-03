import { useMemo, type ReactElement, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { WEEK_HOUR_HEIGHT } from '@/shared/constants/calendar.constant';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { cn } from '@/shared/libs/utils';

type CalendarWeekViewProps = {
  anchor: Date;
  selected: Date;
  entries: readonly CalendarEntry[];
  onSelectDay: (date: Date) => void;
  onSelect?: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
};

const MIN_BLOCK_HEIGHT = 22;

export function CalendarWeekView({
  anchor,
  selected,
  entries,
  onSelectDay,
  onSelect,
  onLongPress,
  renderContextMenu,
}: CalendarWeekViewProps) {
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const days = useMemo(() => date.weekDays(anchor), [anchor, date]);
  const hours = useMemo(
    () => date.timelineHours(entries.map((entry) => date.hourOf(new Date(entry.startsAt)))),
    [date, entries]
  );
  const firstHour = hours[0] ?? 0;
  const gridHeight = hours.length * WEEK_HOUR_HEIGHT;

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    for (const entry of entries) {
      const key = date.startOfDay(new Date(entry.startsAt)).getTime();
      const list = map.get(key);
      if (list) list.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [date, entries]);

  function offsetFor(entry: CalendarEntry): { top: number; height: number } {
    const start = new Date(entry.startsAt);
    const minutes = (date.hourOf(start) - firstHour) * 60 + date.minuteOf(start);
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
        {days.map((day) => {
          const isSelected = date.sameDay(day, selected);
          return (
            <Pressable
              key={day.toISOString()}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              className="flex-1 items-center gap-1 active:opacity-70"
              onPress={() => onSelectDay(day)}>
              <Text className="text-muted-foreground text-micro font-medium capitalize">
                {date.formatWeekdayShort(day)}
              </Text>
              <View
                className={cn(
                  'size-7 items-center justify-center rounded-full',
                  isSelected && 'bg-interactive'
                )}>
                <Text
                  className={cn(
                    'text-caption font-semibold',
                    isSelected ? 'text-foreground-on-interactive' : 'text-foreground'
                  )}>
                  {date.formatDayNumber(day)}
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
                <Text className="text-muted-foreground text-micro">{date.formatHour(hour)}</Text>
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
                const position = { position: 'absolute' as const, top, height, left: 2, right: 2 };
                const pressable = (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={entry.title}
                    style={renderContextMenu ? undefined : position}
                    className={cn(
                      'justify-center overflow-hidden rounded-[8px] px-1.5',
                      renderContextMenu && 'flex-1',
                      entry.status === 'complete'
                        ? 'bg-success/20'
                        : entry.source === 'task'
                          ? 'bg-accent-soft'
                          : 'bg-surface-secondary'
                    )}
                    onPress={onSelect ? () => onSelect(entry) : undefined}
                    onLongPress={onLongPress ? () => onLongPress(entry) : undefined}>
                    <Text className="text-foreground text-micro font-semibold" numberOfLines={2}>
                      {entry.title}
                    </Text>
                  </Pressable>
                );

                if (!renderContextMenu) return pressable;

                return (
                  <View key={entry.id} style={position}>
                    {renderContextMenu(entry, pressable)}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
