import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { DAYS_PER_WEEK } from '@/shared/constants/calendar.constant';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { cn } from '@/shared/libs/utils';

const MONTH_CELL_ENTRIES = 3;

const EMPTY: readonly CalendarEntry[] = [];

type CalendarMonthViewProps = {
  anchor: Date;
  selected: Date;
  entries: readonly CalendarEntry[];
  onSelectDay: (date: Date) => void;
  fill?: boolean;
};

type DayCellProps = {
  day: Date;
  entries: readonly CalendarEntry[];
  isSelected: boolean;
  isToday: boolean;
  outside: boolean;
  label: string;
  dayNumber: string;
  fill: boolean;
  onPress: (date: Date) => void;
};

const DayCell = memo(function DayCell({
  day,
  entries,
  isSelected,
  isToday,
  outside,
  label,
  dayNumber,
  fill,
  onPress,
}: DayCellProps) {
  const visible = entries.slice(0, MONTH_CELL_ENTRIES);
  const overflow = entries.length - visible.length;

  if (!fill) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={label}
        className="min-h-14 flex-1 items-center justify-center py-1 active:opacity-60"
        onPress={() => onPress(day)}>
        <View
          className={cn(
            'size-9 items-center justify-center rounded-full',
            isSelected && 'bg-interactive',
            !isSelected && isToday && 'border-foreground/25 border'
          )}>
          <Text
            className={cn(
              'text-[15px]',
              isSelected
                ? 'text-foreground-on-interactive font-semibold'
                : outside
                  ? 'text-muted-foreground/40'
                  : 'text-foreground'
            )}>
            {dayNumber}
          </Text>
        </View>
        {entries.length > 0 ? (
          <View className="mt-1 w-5 gap-[2px]">
            {visible.map((entry) => (
              <View
                key={entry.id}
                className={cn('h-[3px] rounded-full', !entry.color && 'bg-foreground-secondary/60')}
                style={entry.color ? { backgroundColor: entry.color } : undefined}
              />
            ))}
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={label}
      className={cn(
        'border-border-subtle/60 min-h-0 flex-1 gap-1 rounded-xl border p-1.5 active:opacity-70 lg:p-2',
        isSelected ? 'bg-card border-transparent' : 'bg-transparent'
      )}
      onPress={() => onPress(day)}>
      <View className="flex-row items-center justify-between">
        <View
          className={cn(
            'size-6 items-center justify-center rounded-full',
            isToday && !isSelected && 'border-foreground/25 border',
            isSelected && 'bg-interactive'
          )}>
          <Text
            className={cn(
              'text-[12px] font-medium lg:text-[13px]',
              isSelected
                ? 'text-foreground-on-interactive'
                : outside
                  ? 'text-muted-foreground/40'
                  : 'text-foreground'
            )}>
            {dayNumber}
          </Text>
        </View>
        {overflow > 0 ? (
          <Text className="text-muted-foreground text-[11px]">+{overflow}</Text>
        ) : null}
      </View>

      <View className="min-h-0 flex-1 gap-1 overflow-hidden">
        {visible.map((entry) => (
          <View key={entry.id} className="bg-surface-secondary rounded-md px-1.5 py-0.5">
            <Text className="text-[11px] leading-4" numberOfLines={1}>
              {entry.title}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
});

export function CalendarMonthView({
  anchor,
  selected,
  entries,
  onSelectDay,
  fill = false,
}: CalendarMonthViewProps) {
  const date = useDateFormatter();
  const weekdayLabels = useMemo(
    () => date.weekDays(anchor).map(date.formatWeekdayShort),
    [anchor, date]
  );
  const weeks = useMemo(() => {
    const days = date.monthGridDays(anchor);
    const rows: Date[][] = [];
    for (let index = 0; index < days.length; index += DAYS_PER_WEEK)
      rows.push(days.slice(index, index + DAYS_PER_WEEK));
    return rows;
  }, [anchor, date]);
  const entriesByDay = useMemo(() => {
    const map = new Map<number, CalendarEntry[]>();
    for (const entry of entries) {
      const key = date.startOfDay(new Date(entry.startsAt)).getTime();
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [date, entries]);

  return (
    <View className={cn('gap-1', fill && 'flex-1')}>
      <View className="flex-row pb-1">
        {weekdayLabels.map((label) => (
          <View key={label} className="flex-1 items-center">
            <Text className="text-muted-foreground text-[11px] font-semibold tracking-[1.2px] uppercase">
              {label.slice(0, 1)}
            </Text>
          </View>
        ))}
      </View>
      <View className={cn(fill ? 'min-h-0 flex-1 gap-1' : undefined)}>
        {weeks.map((week) => (
          <View
            key={week[0].getTime()}
            className={cn('flex-row items-stretch', fill && 'min-h-0 flex-1 gap-1')}>
            {week.map((day) => (
              <DayCell
                key={day.getTime()}
                day={day}
                entries={entriesByDay.get(day.getTime()) ?? EMPTY}
                isSelected={date.sameDay(day, selected)}
                isToday={date.sameDay(day, new Date())}
                outside={!date.isSameMonth(day, anchor)}
                label={date.formatFullDate(day)}
                dayNumber={date.formatDayNumber(day)}
                fill={fill}
                onPress={onSelectDay}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}
