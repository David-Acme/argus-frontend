import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type {
  GuardClosedMode,
  GuardEnvironment,
  GuardEnvironmentPatch,
  GuardHoursKind,
  GuardQuietPolicy,
} from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { HoursEditor } from '@/features/security/components/hours-editor';
import { DIGEST_HOUR_OPTIONS, QUIET_HOUR_OPTIONS, WEEK_DAY_KEYS } from '@/features/security/constants';
import { ENVIRONMENT_PRESETS, HOURS_BY_KIND } from '@/features/security/model/environment-presets';
import { parseHours, summarizeHours } from '@/features/security/model/hours';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type EnvironmentSettingsPanelProps = {
  environment: GuardEnvironment;
  onUpdate?: (patch: GuardEnvironmentPatch) => Promise<boolean>;
  className?: string;
};

type HoursRowProps = {
  kind: GuardHoursKind;
  summary: string | null;
  onPress?: () => void;
};

type HourSelectProps = {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (hour: number) => void;
};

const rowHover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

const clock = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function HourSelect({ label, value, disabled, onChange }: HourSelectProps) {
  const { t } = useTranslation();
  const options = QUIET_HOUR_OPTIONS.map((hour) => ({ value: String(hour), label: clock(hour) }));
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text variant="micro">{label}</Text>
      <AdaptiveSelect
        options={options}
        value={String(value)}
        onChange={(next) => onChange(Number(next))}
        title={label}
        closeLabel={t('common.close')}
        searchPlaceholder={t('screens.security.hours.pick-time')}
        emptyLabel={t('screens.security.hours.pick-time')}
        filterThreshold={options.length + 1}
        trigger={<SelectField label={clock(value)} disabled={disabled} />}
      />
    </View>
  );
}

function HoursRow({ kind, summary, onPress }: HoursRowProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`screens.security.site.hours.${kind}`)}
      accessibilityHint={t(`screens.security.site.hours-hint.${kind}`)}
      accessibilityState={{ disabled: onPress === undefined }}
      disabled={onPress === undefined}
      onPress={onPress}
      className={cn('-mx-2 flex-row items-center gap-3 rounded-2xl px-2 py-2.5 active:opacity-70', rowHover)}>
      <View className="bg-surface-secondary size-9 items-center justify-center rounded-full">
        <Icon name={kind === 'asleep' ? 'moon' : 'clock'} className="text-foreground-secondary size-4" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="body" className="font-medium">
          {t(`screens.security.site.hours.${kind}`)}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {summary ?? t('screens.security.site.hours-empty')}
        </Text>
      </View>
      {onPress ? <Icon name="chevron-right" className="text-muted-foreground size-4" /> : null}
    </Pressable>
  );
}

export function EnvironmentSettingsPanel({ environment, onUpdate, className }: EnvironmentSettingsPanelProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<GuardHoursKind | null>(null);
  const readOnly = onUpdate === undefined;
  const kind = environment.kind;
  const kinds = HOURS_BY_KIND[kind];
  const hasHours = kinds.some((hoursKind) => environment[hoursKind].trim().length > 0);
  const update = (patch: GuardEnvironmentPatch) => {
    if (onUpdate) void onUpdate(patch);
  };

  const quietOptions = useMemo(
    () =>
      (['inherit', 'custom', 'off'] as const).map((value) => ({
        value,
        label: t(`screens.security.site.quiet-policies.${value}`),
      })),
    [t]
  );

  const closedOptions = useMemo(
    () =>
      (['away', 'armed'] as const).map((value) => ({
        value,
        label: t(`screens.security.site.closed-modes.${value}`),
      })),
    [t]
  );

  const digestOptions = useMemo(
    () =>
      DIGEST_HOUR_OPTIONS.map((hour) => ({
        value: String(hour),
        label:
          hour < 0
            ? t('screens.security.site.digest-off')
            : t('screens.security.site.digest-at', { hour: `${String(hour).padStart(2, '0')}:00` }),
      })),
    [t]
  );

  const summary = (hoursKind: GuardHoursKind): string | null => {
    const windows = parseHours(environment[hoursKind]);
    if (windows.length === 0) return null;
    return summarizeHours(windows, {
      day: (day) => t(`screens.security.site.days.${WEEK_DAY_KEYS[day] ?? 'mon'}`),
      everyDay: t('screens.security.site.every-day'),
    });
  };

  const applyPreset = () => update({ ...ENVIRONMENT_PRESETS[kind], scheduleEnabled: true });

  const saveHours = async (hoursKind: GuardHoursKind, spec: string): Promise<boolean> => {
    if (!onUpdate) return false;
    const patch: GuardEnvironmentPatch = {};
    patch[hoursKind] = spec;
    return onUpdate(patch);
  };

  const digestValue = String(environment.digestHour);

  return (
    <Panel
      title={t('screens.security.site.title')}
      description={t('screens.security.site.description')}
      className={className}>
      <ToggleRow
        label={t('screens.security.site.schedule')}
        hint={t('screens.security.site.schedule-hint')}
        value={environment.scheduleEnabled}
        disabled={readOnly}
        onChange={(next) => update({ scheduleEnabled: next })}
      />
      <View className={cn('gap-0.5', !environment.scheduleEnabled && 'opacity-60')}>
        {kinds.map((hoursKind) => (
          <HoursRow
            key={hoursKind}
            kind={hoursKind}
            summary={summary(hoursKind)}
            onPress={readOnly ? undefined : () => setEditing(hoursKind)}
          />
        ))}
      </View>
      {!hasHours && !readOnly ? (
        <Button variant="secondary" size="sm" className="self-start" onPress={applyPreset}>
          <Icon name="sparkles" />
          <Text>{t('screens.security.site.preset')}</Text>
        </Button>
      ) : null}
      {kind !== 'home' ? (
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.site.closed')}</Text>
          <SegmentedControl<GuardClosedMode>
            options={closedOptions}
            value={environment.closedMode}
            onChange={(next) => {
              if (!readOnly) update({ closedMode: next });
            }}
            accessibilityLabel={t('screens.security.site.closed')}
          />
          <Text variant="caption">
            {t('screens.security.site.closed-hint')}
          </Text>
        </View>
      ) : null}
      <View className="gap-1.5">
        <Text variant="label">{t('screens.security.site.digest')}</Text>
        <AdaptiveSelect
          options={digestOptions}
          value={digestValue}
          onChange={(next) => update({ digestHour: Number(next) })}
          title={t('screens.security.site.digest')}
          closeLabel={t('common.close')}
          searchPlaceholder={t('screens.security.hours.pick-time')}
          emptyLabel={t('screens.security.hours.pick-time')}
          filterThreshold={digestOptions.length + 1}
          trigger={
            <SelectField
              label={digestOptions.find((option) => option.value === digestValue)?.label}
              disabled={readOnly}
            />
          }
        />
        <Text variant="caption">
          {t('screens.security.site.digest-hint')}
        </Text>
      </View>
      <View className="gap-1.5">
        <Text variant="label">{t('screens.security.site.quiet')}</Text>
        <SegmentedControl<GuardQuietPolicy>
          options={quietOptions}
          value={environment.quietPolicy}
          onChange={(next) => {
            if (!readOnly) update({ quietPolicy: next });
          }}
          accessibilityLabel={t('screens.security.site.quiet')}
        />
        {environment.quietPolicy === 'custom' ? (
          <View className="flex-row gap-3">
            <HourSelect
              label={t('screens.security.site.quiet-from')}
              value={environment.quietStartHour}
              disabled={readOnly}
              onChange={(hour) => update({ quietStartHour: hour })}
            />
            <HourSelect
              label={t('screens.security.site.quiet-to')}
              value={environment.quietEndHour}
              disabled={readOnly}
              onChange={(hour) => update({ quietEndHour: hour })}
            />
          </View>
        ) : null}
        <Text variant="caption">{t('screens.security.site.quiet-hint')}</Text>
      </View>
      {editing ? (
        <HoursEditor
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          title={t('screens.security.hours.title', { kind: t(`screens.security.site.hours.${editing}`) })}
          description={t(`screens.security.site.hours-hint.${editing}`)}
          spec={environment[editing]}
          onSave={(spec) => saveHours(editing, spec)}
        />
      ) : null}
    </Panel>
  );
}
