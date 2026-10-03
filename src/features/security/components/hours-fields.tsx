import { Platform, Pressable, View } from 'react-native';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { WEEK_DAY_KEYS } from '@/features/security/constants';
import {
  crossesMidnight,
  HALF_HOURS,
  WEEK_ORDER,
  type HoursWindow,
} from '@/features/security/model/hours';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type HoursFieldsProps = {
  windows: readonly HoursWindow[];
  onChange: (windows: HoursWindow[]) => void;
};

type WindowRowProps = {
  window: HoursWindow;
  onChange: (window: HoursWindow) => void;
  onRemove: () => void;
};

type TimeSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const chipHover = Platform.select({ web: 'hover:bg-surface-secondary', default: '' });
const TIME_OPTIONS = HALF_HOURS.map((clock) => ({ value: clock, label: clock }));
const NEW_WINDOW: HoursWindow = { days: [], start: '09:00', end: '18:00' };

function TimeSelect({ label, value, onChange }: TimeSelectProps) {
  const { t } = useTranslation();
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text variant="micro">{label}</Text>
      <AdaptiveSelect
        options={TIME_OPTIONS}
        value={value}
        onChange={onChange}
        title={label}
        closeLabel={t('common.close')}
        searchPlaceholder={t('screens.security.hours.pick-time')}
        emptyLabel={t('screens.security.hours.pick-time')}
        filterThreshold={TIME_OPTIONS.length + 1}
        trigger={<SelectField label={value} accessibilityHint={label} />}
      />
    </View>
  );
}

function WindowRow({ window, onChange, onRemove }: WindowRowProps) {
  const { t } = useTranslation();
  const everyDay = window.days.length === 0;

  const toggleDay = (day: number) => {
    const current = everyDay ? [...WEEK_ORDER] : [...window.days];
    const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
    if (next.length === 0) return;
    onChange({ ...window, days: next.length === 7 ? [] : next });
  };

  return (
    <View className="bg-surface-secondary/60 gap-3 rounded-2xl p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="label">{t('screens.security.hours.days')}</Text>
        <Button
          variant="ghost"
          size="icon"
          accessibilityLabel={t('screens.security.hours.remove')}
          onPress={onRemove}>
          <Icon name="trash" className="text-muted-foreground size-4" />
        </Button>
      </View>
      <View accessibilityRole="toolbar" className="flex-row flex-wrap gap-1.5">
        {WEEK_ORDER.map((day) => {
          const active = everyDay || window.days.includes(day);
          const key = WEEK_DAY_KEYS[day] ?? 'mon';
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={t(`screens.security.site.days.${key}`)}
              onPress={() => toggleDay(day)}
              className={cn(
                'min-h-9 min-w-11 items-center justify-center rounded-full border px-2.5 active:opacity-70',
                active ? 'bg-interactive border-interactive' : cn('bg-card border-border', chipHover)
              )}>
              <Text
                variant="label"
                className={active ? 'text-foreground-on-interactive' : 'text-foreground'}>
                {t(`screens.security.site.days.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row gap-3">
        <TimeSelect
          label={t('screens.security.hours.from')}
          value={window.start}
          onChange={(start) => onChange({ ...window, start })}
        />
        <TimeSelect
          label={t('screens.security.hours.to')}
          value={window.end}
          onChange={(end) => onChange({ ...window, end })}
        />
      </View>
      {crossesMidnight(window) ? (
        <View className="flex-row items-center gap-1.5">
          <Icon name="moon" className="text-muted-foreground size-3.5" />
          <Text variant="caption">{t('screens.security.hours.next-day')}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function HoursFields({ windows, onChange }: HoursFieldsProps) {
  const { t } = useTranslation();

  const update = (index: number, next: HoursWindow) =>
    onChange(windows.map((window, position) => (position === index ? next : window)));

  const remove = (index: number) => onChange(windows.filter((_, position) => position !== index));

  return (
    <View className="gap-3">
      {windows.length === 0 ? (
        <Text variant="caption">{t('screens.security.hours.empty')}</Text>
      ) : (
        windows.map((window, index) => (
          <WindowRow
            key={`${index}-${window.start}-${window.end}`}
            window={window}
            onChange={(next) => update(index, next)}
            onRemove={() => remove(index)}
          />
        ))
      )}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onPress={() => onChange([...windows, NEW_WINDOW])}>
        <Icon name="plus" />
        <Text>{t('screens.security.hours.add')}</Text>
      </Button>
    </View>
  );
}
