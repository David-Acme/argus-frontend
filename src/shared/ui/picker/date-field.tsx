import { clsx } from 'clsx';
import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { usePickerLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { FilterChip } from '@/shared/ui/chip';
import { DesktopDateField } from './desktop-fields';
import { dayStart, quickDays } from './model/calendar';
import { PickerCalendar } from './picker-calendar';
import { PickerClock } from './picker-clock';
import { PickerShell } from './picker-shell';
import type { DateFieldProps } from './picker-types';
import { usePickerForm } from './use-picker-form';

type QuickProps = Pick<DateFieldProps, 'value' | 'now' | 'min'> & {
  onPick: (day: number) => void;
};

const FIVE = 5;

const HOUR = 60;

function Quick({ value, now, min, onPick }: QuickProps) {
  const { t } = useTranslation();
  const days = quickDays(now);
  const chips = [
    { key: 'today', label: t('common.picker.today'), at: days.today },
    { key: 'tomorrow', label: t('common.picker.tomorrow'), at: days.tomorrow },
    { key: 'weekend', label: t('common.picker.weekend'), at: days.weekend },
  ].filter((chip) => min === undefined || chip.at >= dayStart(min));
  const selected = value === null ? null : dayStart(value);
  return (
    <View className="gap-row-trail-gap flex-row flex-wrap">
      {chips.map((chip) => (
        <FilterChip
          key={chip.key}
          label={chip.label}
          selected={selected === chip.at}
          onPress={() => onPick(chip.at)}
        />
      ))}
    </View>
  );
}

function useShown(value: number | null, minutes: number | null | undefined): string {
  const { t } = useTranslation();
  const date = useDateFormatter();
  if (value === null) return t('common.picker.no-date');
  const day = date.formatPickerDay(new Date(value));
  if (minutes === undefined || minutes === null) return day;
  const at = new Date(2000, 0, 1, Math.floor(minutes / HOUR), minutes % HOUR);
  return `${day} · ${date.formatTime(at)}`;
}

function TouchDateField({
  label,
  value,
  now,
  onChange,
  min,
  quick,
  onClear,
  time,
  testID,
}: DateFieldProps) {
  const { t } = useTranslation();
  const layout = usePickerLayout();
  const shown = useShown(value, time?.value);
  return (
    <PickerShell label={label} value={shown} empty={value === null} testID={testID}>
      {(close, side) => (
        <View className="gap-row-trail-gap">
          {quick ? (
            <Quick
              value={value}
              now={now}
              min={min}
              onPick={(day) => {
                onChange(day);
                if (!time) close();
              }}
            />
          ) : null}
          <View className={clsx('gap-row-gap', side && 'flex-row items-start')}>
            <View className={side ? 'w-picker-width' : undefined}>
              <PickerCalendar
                value={value}
                min={min ?? null}
                now={now}
                layout={layout}
                onPick={(day) => {
                  onChange(day);
                  if (!time) close();
                }}
              />
            </View>
            {time ? (
              <PickerClock
                value={time.value ?? time.fallback}
                step={FIVE}
                layout={layout}
                onChange={time.onChange}
              />
            ) : null}
          </View>
          {onClear && value !== null ? (
            <Button
              variant="ghost"
              compact
              label={t('common.picker.clear')}
              onPress={() => {
                onClear();
                close();
              }}
            />
          ) : null}
        </View>
      )}
    </PickerShell>
  );
}

export function DateField(props: DateFieldProps) {
  const form = usePickerForm();
  if (form === 'desktop') return <DesktopDateField {...props} />;
  return <TouchDateField {...props} />;
}
