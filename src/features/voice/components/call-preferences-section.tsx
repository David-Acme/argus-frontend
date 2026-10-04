import { useMemo } from 'react';
import { View } from 'react-native';
import type { CallMode, CallPreferences, CallTrigger, GuardEnvironment } from '@/core/types';
import { useCallPreferences } from '@/features/voice/hooks/use-call-preferences';
import {
  CALL_TRIGGERS,
  dndActive,
  dndChoiceOf,
  dndUntilFor,
  environmentMuted,
  quietHoursFor,
  quietPresetOf,
  toggledEnvironments,
  type DndChoice,
  type QuietPreset,
} from '@/features/voice/model/call-preferences';
import { ListRow } from '@/shared/components/ui/list-row';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';

type TriggerRowProps = {
  trigger: CallTrigger;
  value: CallMode;
  onChange: (trigger: CallTrigger, mode: CallMode) => void;
};

type ChoiceRowProps<T extends string> = {
  label: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

const MODES: readonly CallMode[] = ['call', 'notify', 'off'];
const DND_TICK_MS = 30_000;

function ChoiceRow<T extends string>({ label, hint, options, value, onChange }: ChoiceRowProps<T>) {
  return (
    <View className="gap-1.5 px-2 py-2">
      <View className="gap-0.5">
        <Text variant="body">{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        accessibilityLabel={label}
      />
    </View>
  );
}

function TriggerRow({ trigger, value, onChange }: TriggerRowProps) {
  const { t } = useTranslation();
  const options = useMemo(
    () =>
      MODES.map((mode) => ({ value: mode, label: t(`screens.voice.preferences.mode.${mode}`) })),
    [t]
  );
  return (
    <ChoiceRow
      label={t(`screens.voice.preferences.trigger.${trigger}`)}
      options={options}
      value={value}
      onChange={(mode) => onChange(trigger, mode)}
    />
  );
}

export function CallPreferencesSection() {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { preferences, status, update, reload } = useCallPreferences();
  const now = useNow(DND_TICK_MS);
  const environments =
    useViewCacheValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments) ?? [];
  const quietOptions = useMemo(
    () =>
      (['off', 'night', 'late'] as const).map((value) => ({
        value,
        label: t(`screens.voice.preferences.quiet.${value}`),
      })),
    [t]
  );
  const dndOptions = useMemo(
    () =>
      (['off', 'hour', 'morning'] as const).map((value) => ({
        value,
        label: t(`screens.voice.preferences.dnd.${value}`),
      })),
    [t]
  );

  if (!preferences) {
    return status === 'failed' ? (
      <ListRow
        icon="rotate-ccw"
        title={t('screens.voice.preferences.unavailable')}
        onPress={() => void reload()}
      />
    ) : (
      <Text variant="caption" className="px-2 py-3">
        {t('screens.voice.preferences.loading')}
      </Text>
    );
  }

  const quiet = quietPresetOf(preferences);
  const quietChoices =
    quiet === 'custom'
      ? [
          ...quietOptions,
          {
            value: 'custom' as const,
            label: t('screens.voice.preferences.quiet.custom', {
              from: String(preferences.quietStartHour),
              to: String(preferences.quietEndHour),
            }),
          },
        ]
      : quietOptions;
  const resting = dndActive(preferences, now);
  const dndValue: DndChoice = dndChoiceOf(preferences, new Date(now));
  const changeTrigger = (trigger: CallTrigger, mode: CallMode) =>
    void update({ [trigger]: mode } as Partial<CallPreferences>);
  const changeQuiet = (preset: QuietPreset) => {
    if (preset !== 'custom') void update(quietHoursFor(preset));
  };

  return (
    <View>
      <ToggleRow
        label={t('screens.voice.preferences.enabled')}
        hint={t('screens.voice.preferences.enabled-hint')}
        value={preferences.enabled}
        onChange={(enabled) => void update({ enabled })}
      />
      {preferences.enabled ? (
        <>
          {CALL_TRIGGERS.map((trigger) => (
            <TriggerRow
              key={trigger}
              trigger={trigger}
              value={preferences[trigger]}
              onChange={changeTrigger}
            />
          ))}
          <ChoiceRow
            label={t('screens.voice.preferences.quiet-title')}
            hint={t('screens.voice.preferences.quiet-hint')}
            options={quietChoices}
            value={quiet}
            onChange={changeQuiet}
          />
          <ToggleRow
            label={t('screens.voice.preferences.critical-bypass')}
            hint={t('screens.voice.preferences.critical-bypass-hint')}
            value={preferences.criticalBypass}
            onChange={(criticalBypass) => void update({ criticalBypass })}
          />
          <ChoiceRow
            label={t('screens.voice.preferences.dnd-title')}
            hint={
              resting
                ? t('screens.voice.preferences.dnd-until', {
                    time: date.formatTime(new Date(preferences.dndUntil * 1000)),
                  })
                : undefined
            }
            options={dndOptions}
            value={dndValue}
            onChange={(choice) => void update({ dndUntil: dndUntilFor(choice, new Date()) })}
          />
          {environments.length > 1
            ? environments.map((environment) => (
                <ToggleRow
                  key={environment.id}
                  label={t('screens.voice.preferences.environment', { name: environment.name })}
                  value={!environmentMuted(preferences, environment.id)}
                  onChange={(calls) =>
                    void update({
                      mutedEnvironmentIds: toggledEnvironments(preferences, environment.id, !calls),
                    })
                  }
                />
              ))
            : null}
        </>
      ) : null}
    </View>
  );
}
