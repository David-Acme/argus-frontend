import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { CalendarMonthView } from '@/features/agenda/components/calendar-month-view';

type DayPickerFieldProps = {
  value: Date;
  onChange: (day: Date) => void;
};

export function DayPickerField({ value, onChange }: DayPickerFieldProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value);
  const today = date.startOfDay(new Date());
  const label = date.formatPickerDay(value);

  const shortcut = (day: Date, text: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={() => onChange(day)}
      className="bg-surface-secondary rounded-full px-3 py-1.5 active:opacity-70">
      <Text variant="micro" className="font-medium">{text}</Text>
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
        <Text variant="body">{label}</Text>
        <Icon name="calendar" className="text-muted-foreground size-4" />
      </Pressable>
      {shortcut(today, t('screens.agenda.today'))}
      {shortcut(date.addDays(today, 1), t('screens.agenda.tomorrow'))}

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t('screens.agenda.pick-day')}
        closeLabel={t('common.close')}>
        <View className="gap-2 pb-1">
          <View className="flex-row items-center justify-between">
            <Text variant="label" className="font-semibold">{date.formatMonthYear(month)}</Text>
            <View className="flex-row gap-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.agenda.previous-month')}
                onPress={() => setMonth((current) => date.addMonths(current, -1))}
                className="bg-surface-secondary size-9 items-center justify-center rounded-full active:opacity-70">
                <Icon name="chevron-left" className="text-foreground size-4" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('screens.agenda.next-month')}
                onPress={() => setMonth((current) => date.addMonths(current, 1))}
                className="bg-surface-secondary size-9 items-center justify-center rounded-full active:opacity-70">
                <Icon name="chevron-right" className="text-foreground size-4" />
              </Pressable>
            </View>
          </View>
          <CalendarMonthView
            anchor={month}
            selected={value}
            entries={[]}
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
