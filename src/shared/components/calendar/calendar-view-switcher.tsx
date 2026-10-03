import { Pressable, View } from 'react-native';
import type { CalendarView } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { CALENDAR_VIEWS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type CalendarViewSwitcherProps = {
  view: CalendarView;
  labels: Record<CalendarView, string>;
  onChange: (view: CalendarView) => void;
};

export function CalendarViewSwitcher({ view, labels, onChange }: CalendarViewSwitcherProps) {
  return (
    <View className="bg-surface-secondary flex-row rounded-full p-1">
      {CALENDAR_VIEWS.map((option) => {
        const selected = option === view;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[option]}
            className={cn(
              'flex-1 items-center rounded-full px-3 py-1.5 active:opacity-70',
              selected && 'bg-card shadow-sm shadow-black/10'
            )}
            onPress={() => onChange(option)}>
            <Text
              className={cn(
                'text-xs font-semibold capitalize',
                selected ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
