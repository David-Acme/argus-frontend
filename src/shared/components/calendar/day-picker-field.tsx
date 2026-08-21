import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { addDays, addMonths, startOfDay } from '@/shared/libs/calendar';
import { CalendarMonthView } from './calendar-month-view';

type DayPickerFieldProps = {
  value: Date;
  onChange: (day: Date) => void;
  /** Localized short weekday names, Monday first. */
  weekdayLabels: readonly string[];
  locale: string;
};

/** Shows the chosen day and opens a month to change it; two shortcuts cover most cases. */
export function DayPickerField({ value, onChange, weekdayLabels, locale }: DayPickerFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value);
  const today = startOfDay(new Date());
  const label = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(value);

  const shortcut = (day: Date, text: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={() => onChange(day)}
      className="bg-surface-secondary rounded-full px-3 py-1.5 active:opacity-70">
      <Text className="text-[12px] font-medium">{text}</Text>
    </Pressable>
  );

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('screens.agenda.pick-day')}
        onPress={() => {
          setMonth(value);
          setOpen(true);
        }}
        className="border-border bg-card h-11 flex-1 flex-row items-center justify-between rounded-md border px-3 active:opacity-70">
        <Text className="text-[14px]">{label}</Text>
        <Icon name="calendar" className="text-muted-foreground size-4" />
      </Pressable>
      {shortcut(today, t('screens.agenda.today'))}
      {shortcut(addDays(today, 1), t('screens.agenda.tomorrow'))}

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t('screens.agenda.pick-day')}
        closeLabel={t('common.close')}>
        <View className="gap-2 pb-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-[14px] font-semibold">
              {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
            </Text>
            <View className="flex-row gap-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.agenda.previous-month')}
                onPress={() => setMonth((current) => addMonths(current, -1))}
                className="bg-surface-secondary size-9 items-center justify-center rounded-full active:opacity-70">
                <Icon name="chevron-left" className="text-foreground size-4" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.agenda.next-month')}
                onPress={() => setMonth((current) => addMonths(current, 1))}
                className="bg-surface-secondary size-9 items-center justify-center rounded-full active:opacity-70">
                <Icon name="chevron-right" className="text-foreground size-4" />
              </Pressable>
            </View>
          </View>
          <CalendarMonthView
            anchor={month}
            selected={value}
            entries={[]}
            weekdayLabels={weekdayLabels}
            onSelectDay={(day) => {
              onChange(day);
              setOpen(false);
            }}
          />
        </View>
      </AdaptiveDialog>
    </View>
  );
}
