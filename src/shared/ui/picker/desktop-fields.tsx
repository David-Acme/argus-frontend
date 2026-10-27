import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { usePickerLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { DesktopShell } from './desktop-popover';
import { useDateSegments, useTimeSegments } from './desktop-segments';
import { dayStart } from './model/calendar';
import type { SegmentPart } from './model/segments';
import { PickerCalendar } from './picker-calendar';
import type { DateFieldProps, TimeFieldProps } from './picker-types';
import { SegmentInput } from './segment-input';
import { TimeList } from './time-list';

const LIST_STEP = 15;

const DATE_SEPARATOR = '/';

const TIME_SEPARATOR = ':';

const JOIN = ' · ';

const PERIOD_SEPARATOR = ' ';

const ignore = () => undefined;

const timeSeparator = (part: SegmentPart | undefined): string =>
  part === 'period' ? PERIOD_SEPARATOR : TIME_SEPARATOR;

type DropdownProps = Pick<
  DateFieldProps,
  'value' | 'now' | 'onChange' | 'min' | 'onClear' | 'time'
> & {
  close: () => void;
};

function DateDropdown({ value, now, onChange, min, onClear, time, close }: DropdownProps) {
  const { t } = useTranslation();
  const layout = usePickerLayout();
  return (
    <View className="gap-row-gap flex-row">
      <View className="w-picker-width gap-row-trail-gap">
        <PickerCalendar
          value={value}
          min={min ?? null}
          now={now}
          layout={layout}
          todayLink
          onPick={(at) => {
            onChange(at);
            close();
          }}
        />
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
      {time ? (
        <View className="border-line pl-palette-group min-w-wheel-width border-l">
          <TimeList
            label={t('common.picker.times')}
            value={time.value}
            fallback={time.fallback}
            step={LIST_STEP}
            onPick={(minutes) => {
              time.onChange(minutes);
              close();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

export function DesktopDateField({
  label,
  value,
  now,
  onChange,
  min,
  onClear,
  time,
  testID,
}: DateFieldProps) {
  const { t } = useTranslation();
  const day = useDateSegments(value, (at) => {
    if (min !== undefined && at < dayStart(min)) return false;
    onChange(at);
    return true;
  });
  const clock = useTimeSegments(time?.value ?? null, time?.onChange ?? ignore);
  const segments = time ? [...day.segments, ...clock.segments] : day.segments;
  const count = day.segments.length;
  const separator = (index: number) => {
    if (index < count) return DATE_SEPARATOR;
    return index === count ? JOIN : timeSeparator(segments[index]?.part);
  };
  const problem = day.problem ?? (time ? clock.problem : null);
  return (
    <DesktopShell
      label={label}
      opener={t('common.picker.open-calendar')}
      icon="cal"
      error={problem ? t(problem) : null}
      testID={testID}
      segments={
        <SegmentInput
          segments={segments}
          separator={separator}
          onChange={(part, next, final) =>
            part === 'day' || part === 'month' || part === 'year'
              ? day.change(part, next, final)
              : clock.change(part, next, final)
          }
        />
      }>
      {(close) => (
        <DateDropdown
          value={value}
          now={now}
          onChange={onChange}
          min={min}
          onClear={onClear}
          time={time}
          close={close}
        />
      )}
    </DesktopShell>
  );
}

export function DesktopTimeField({
  label,
  value,
  fallback,
  onChange,
  step = LIST_STEP,
  onClear,
  testID,
}: TimeFieldProps) {
  const { t } = useTranslation();
  const clock = useTimeSegments(value, onChange);
  return (
    <DesktopShell
      label={label}
      opener={t('common.picker.open-times')}
      icon="clock"
      error={clock.problem ? t(clock.problem) : null}
      testID={testID}
      segments={
        <SegmentInput
          segments={clock.segments}
          separator={(index) => timeSeparator(clock.segments[index]?.part)}
          onChange={clock.change}
        />
      }>
      {(close) => (
        <View className="gap-row-trail-gap">
          <TimeList
            label={t('common.picker.times')}
            value={value}
            fallback={fallback}
            step={Math.max(step, LIST_STEP)}
            onPick={(minutes) => {
              onChange(minutes);
              close();
            }}
          />
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
    </DesktopShell>
  );
}
