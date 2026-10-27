import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { PickerLayout } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { fromWheels, hourSteps, minuteSteps, snapMinutes, toWheels } from './model/clock';
import { Wheel } from './wheel';

export type PickerClockProps = {
  value: number;
  step: number;
  layout: PickerLayout;
  onChange: (minutes: number) => void;
};

const pad = (value: number): string => String(value).padStart(2, '0');

export function PickerClock({ value, step, layout, onChange }: PickerClockProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { hour12 } = date;
  const wheels = toWheels(snapMinutes(value, step), hour12);
  const hours = hourSteps(hour12);
  const minutes = minuteSteps(step);
  const periods = [date.formatPeriod(false), date.formatPeriod(true)];
  const set = (next: Partial<typeof wheels>) =>
    onChange(fromWheels({ ...wheels, ...next }, hour12));
  return (
    <View className="gap-row-trail-gap flex-row items-center justify-center py-2">
      <Wheel
        label={t('common.picker.hour')}
        items={hours.map((hour) => (hour12 ? String(hour) : pad(hour)))}
        index={Math.max(0, hours.indexOf(wheels.hour))}
        rows={layout.rows}
        onChange={(index) => set({ hour: hours[index] ?? wheels.hour })}
      />
      <Text variant="headline" tone="3">
        :
      </Text>
      <Wheel
        label={t('common.picker.minute')}
        items={minutes.map(pad)}
        index={Math.max(0, minutes.indexOf(wheels.minute))}
        rows={layout.rows}
        onChange={(index) => set({ minute: minutes[index] ?? wheels.minute })}
      />
      {hour12 ? (
        <Wheel
          label={t('common.picker.period')}
          items={periods}
          index={wheels.afternoon ? 1 : 0}
          rows={layout.rows}
          onChange={(index) => set({ afternoon: index === 1 })}
        />
      ) : null}
    </View>
  );
}
