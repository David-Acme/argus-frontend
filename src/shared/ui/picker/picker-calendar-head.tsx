import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { monthOfDay, yearSpan, type CalendarMonth } from './model/calendar';
import { Wheel } from './wheel';

export type CalendarHeadProps = {
  month: CalendarMonth;
  choosing: boolean;
  onChoose: () => void;
  onShift: (step: number) => void;
};

export type MonthWheelsProps = {
  month: CalendarMonth;
  now: number;
  rows: number;
  onChange: (month: CalendarMonth) => void;
};

const YEAR_REACH = 10;

export function CalendarHead({ month, choosing, onChoose, onShift }: CalendarHeadProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const title = date.formatMonthYear(new Date(month.year, month.month, 1));
  return (
    <View className="gap-row-trail-gap flex-row items-center">
      <PressableSurface
        a11y={{ label: t('common.picker.choose-month', { month: title }), role: 'button' }}
        onPress={onChoose}
        pressed={{ fill: true }}
        className="min-h-target-min px-palette-item-x rounded-control flex-row items-center gap-1">
        <Text variant="label" tone={choosing ? 'accent' : 'default'}>
          {title}
        </Text>
        <Icon name={choosing ? 'chevu' : 'chev'} size="small" tone="accent" />
      </PressableSurface>
      <View className="flex-1" />
      {choosing ? null : (
        <>
          <Button
            iconOnly
            compact
            icon="chevl"
            label={t('common.picker.previous-month')}
            onPress={() => onShift(-1)}
          />
          <Button
            iconOnly
            compact
            icon="chev"
            label={t('common.picker.next-month')}
            onPress={() => onShift(1)}
          />
        </>
      )}
    </View>
  );
}

export function MonthWheels({ month, now, rows, onChange }: MonthWheelsProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const names = Array.from({ length: 12 }, (_, index) =>
    date.formatMonth(new Date(2000, index, 1))
  );
  const years = yearSpan(monthOfDay(now).year, YEAR_REACH);
  const yearIndex = Math.max(0, years.indexOf(month.year));
  return (
    <View className="gap-row-gap flex-row justify-center py-2">
      <Wheel
        label={t('common.picker.month')}
        items={names}
        index={month.month}
        rows={rows}
        onChange={(index) => onChange({ year: month.year, month: index })}
      />
      <Wheel
        label={t('common.picker.year')}
        items={years.map(String)}
        index={yearIndex}
        rows={rows}
        onChange={(index) => onChange({ year: years[index] ?? month.year, month: month.month })}
      />
    </View>
  );
}
