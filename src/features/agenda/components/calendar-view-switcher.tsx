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
    <View accessibilityRole="tablist" className="bg-surface-secondary flex-row rounded-2xl p-1">
      {CALENDAR_VIEWS.map((option) => {
        const selected = option === view;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={labels[option]}
            className={cn(
              'min-h-8 flex-1 items-center justify-center rounded-lg px-3 py-1.5 active:opacity-70',
              selected ? 'bg-card shadow-sm shadow-black/10' : 'web:hover:bg-card/60'
            )}
            onPress={() => onChange(option)}>
            <Text
              variant="caption"
              className={cn(
                'font-semibold capitalize',
                selected ? 'text-foreground' : 'text-foreground-secondary'
              )}>
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
