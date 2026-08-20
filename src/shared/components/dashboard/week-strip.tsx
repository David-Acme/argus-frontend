import { Pressable, View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type WeekStripDay = {
  date: Date;
  weekday: string;
  day: string;
};

type WeekStripProps = {
  days: readonly WeekStripDay[];
  selected: Date;
  onSelect: (date: Date) => void;
};

/** Monday-first day picker. The selected day is a raised well. */
export function WeekStrip({ days, selected, onSelect }: WeekStripProps) {
  return (
    <View className="flex-row justify-between">
      {days.map((day) => {
        const isSelected = day.date.getTime() === selected.getTime();
        return (
          <Pressable
            key={day.date.toISOString()}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${day.weekday} ${day.day}`}
            className={cn(
              'min-w-[42px] items-center gap-1.5 rounded-[18px] px-2 py-2.5 active:opacity-70',
              isSelected ? 'bg-card shadow-sm shadow-black/[0.09]' : 'bg-transparent'
            )}
            onPress={() => onSelect(day.date)}>
            <Text
              className={cn(
                'text-[13px] font-medium capitalize',
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {day.weekday}
            </Text>
            <Text
              className={cn(
                'text-[17px] font-semibold',
                isSelected ? 'text-foreground' : 'text-foreground-secondary'
              )}>
              {day.day}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type { WeekStripDay };
