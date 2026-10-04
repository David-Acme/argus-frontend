import { useMemo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type {
  CallLanguage,
  CallMode,
  CallPreferencesPatch,
  CallTrigger,
  GuardEnvironment,
} from '@/core/types';
import { useCallPreferences } from '@/features/voice/hooks/use-call-preferences';
import {
  AGENDA_LEADS,
  CALL_LANGUAGES,
  CALL_TRIGGERS,
  DAY_KEYS,
  PUSH_DELAYS,
  RING_SECONDS,
  WEEK_DAYS,
  dndActive,
  dndChoiceOf,
  dndUntilFor,
  environmentMuted,
  quietDayOn,
  quietHoursFor,
  quietPresetOf,
  toggledEnvironments,
  toggledQuietDay,
  withCurrent,
  type QuietPreset,
} from '@/features/voice/model/call-preferences';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type ChoiceRowProps<T extends string> = {
  label: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

type GroupProps = {
  title: string;
  children: ReactNode;
};

type CallPreferencesSectionProps = {
  className?: string;
};

type QuietDaysProps = {
  mask: number;
  onChange: (mask: number) => void;
};

const MODES: readonly CallMode[] = ['call', 'notify', 'off'];
const DND_TICK_MS = 30_000;

function ChoiceRow<T extends string>({ label, hint, options, value, onChange }: ChoiceRowProps<T>) {
  return (
    <View className="gap-1.5 py-2">
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

function Group({ title, children }: GroupProps) {
  return (
    <View className="gap-0.5 px-2 pt-3 pb-1">
      <Text
        variant="micro"
        className="text-foreground-secondary font-semibold tracking-wide uppercase">
        {title}
      </Text>
      {children}
    </View>
  );
}

function QuietDays({ mask, onChange }: QuietDaysProps) {
  const { t } = useTranslation();
  return (
    <View className="gap-1.5 py-2">
      <View className="gap-0.5">
        <Text variant="body">{t('screens.voice.preferences.quiet-days')}</Text>
        <Text variant="caption">{t('screens.voice.preferences.quiet-days-hint')}</Text>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {WEEK_DAYS.map((day) => {
          const on = quietDayOn(mask, day);
          const name = t(`screens.voice.preferences.days.${DAY_KEYS[day]}`);
          return (
            <Pressable
              key={day}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={name}
              onPress={() => onChange(toggledQuietDay(mask, day))}
              className={cn(
                'size-10 items-center justify-center rounded-full active:opacity-75',
                on ? 'bg-interactive' : 'bg-surface-secondary'
              )}>
              <Text
                variant="label"
                className={on ? 'text-foreground-on-interactive' : 'text-foreground-secondary'}>
                {t(`screens.voice.preferences.days-short.${DAY_KEYS[day]}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function CallPreferencesSection({ className }: CallPreferencesSectionProps) {
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const date = useDateFormatter();
  const { preferences, status, update, reload } = useCallPreferences();
  const now = useNow(DND_TICK_MS);
  const environments =
    useViewCacheValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments) ?? [];
  const modeOptions = useMemo(
    () =>
      MODES.map((mode) => ({ value: mode, label: t(`screens.voice.preferences.mode.${mode}`) })),
    [t]
  );
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
  const languageOptions = useMemo(
    () =>
      CALL_LANGUAGES.map((value) => ({
        value: value as CallLanguage,
        label: t(`screens.voice.preferences.lang.${value || 'account'}`),
      })),
    [t]
  );

  const header = (
    <View className="flex-row items-center gap-3">
      <View className="bg-surface-secondary size-11 items-center justify-center rounded-full">
        <Icon name="phone" className="text-foreground-secondary size-5" />
      </View>
      <View className="min-w-0 flex-1">
        <Text variant="headline">{t('screens.voice.preferences.title')}</Text>
        <Text variant="caption">{t('screens.voice.preferences.subtitle')}</Text>
      </View>
    </View>
  );

  if (!preferences) {
    return (
      <Panel className={cn('gap-4 p-5', className)}>
        {header}
        {status === 'failed' ? (
          <ListRow
            icon="rotate-ccw"
            title={t('screens.voice.preferences.unavailable')}
            onPress={() => void reload()}
          />
        ) : (
          <Text variant="caption" className="px-2 py-3">
            {t('screens.voice.preferences.loading')}
          </Text>
        )}
      </Panel>
    );
  }

  const save = (patch: CallPreferencesPatch) => void update(patch);
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
  const numbered = (values: readonly number[], unit: (value: number) => string) =>
    values.map((value) => ({ value: String(value), label: unit(value) }));
  const changeQuiet = (preset: QuietPreset) => {
    if (preset !== 'custom') save(quietHoursFor(preset));
  };
  const changeTrigger = (trigger: CallTrigger, mode: CallMode) => save({ [trigger]: mode });

  return (
    <Panel className={cn('gap-2 p-5', className)}>
      {header}
      <View className="px-2">
        <ToggleRow
          label={t('screens.voice.preferences.enabled')}
          hint={t('screens.voice.preferences.enabled-hint')}
          value={preferences.enabled}
          onChange={(enabled) => save({ enabled })}
        />
      </View>
      {preferences.enabled ? (
        <View className={isWide ? 'flex-row gap-6' : undefined}>
          <View className={isWide ? 'min-w-0 flex-1' : undefined}>
            <Group title={t('screens.voice.preferences.group-when')}>
              {CALL_TRIGGERS.map((trigger) => (
                <ChoiceRow
                  key={trigger}
                  label={t(`screens.voice.preferences.trigger.${trigger}`)}
                  hint={t(`screens.voice.preferences.trigger-hint.${trigger}`)}
                  options={modeOptions}
                  value={preferences[trigger]}
                  onChange={(mode) => changeTrigger(trigger, mode)}
                />
              ))}
              <ChoiceRow
                label={t('screens.voice.preferences.agenda-lead')}
                hint={t('screens.voice.preferences.agenda-lead-hint')}
                options={numbered(
                  withCurrent(AGENDA_LEADS, preferences.agendaLeadMinutes),
                  (minutes) =>
                    minutes === 0
                      ? t('screens.voice.preferences.at-start')
                      : t('screens.voice.preferences.minutes', { count: String(minutes) })
                )}
                value={String(preferences.agendaLeadMinutes)}
                onChange={(value) => save({ agendaLeadMinutes: Number(value) })}
              />
            </Group>
          </View>

          <View className={isWide ? 'min-w-0 flex-1' : undefined}>
            <Group title={t('screens.voice.preferences.group-how')}>
              <ChoiceRow
                label={t('screens.voice.preferences.ring')}
                hint={t('screens.voice.preferences.ring-hint')}
                options={numbered(withCurrent(RING_SECONDS, preferences.ringSeconds), (seconds) =>
                  t('screens.voice.preferences.seconds', { count: String(seconds) })
                )}
                value={String(preferences.ringSeconds)}
                onChange={(value) => save({ ringSeconds: Number(value) })}
              />
              <ChoiceRow
                label={t('screens.voice.preferences.push-delay')}
                hint={t('screens.voice.preferences.push-delay-hint')}
                options={numbered(
                  withCurrent(PUSH_DELAYS, preferences.pushDelaySeconds),
                  (seconds) =>
                    seconds === 0
                      ? t('screens.voice.preferences.at-once')
                      : t('screens.voice.preferences.seconds', { count: String(seconds) })
                )}
                value={String(preferences.pushDelaySeconds)}
                onChange={(value) => save({ pushDelaySeconds: Number(value) })}
              />
              <ChoiceRow
                label={t('screens.voice.preferences.lang-title')}
                hint={t('screens.voice.preferences.lang-hint')}
                options={languageOptions}
                value={preferences.lang}
                onChange={(lang) => save({ lang })}
              />
              <ToggleRow
                label={t('screens.voice.preferences.live-announce')}
                hint={t('screens.voice.preferences.live-announce-hint')}
                value={preferences.liveAnnounce}
                onChange={(liveAnnounce) => save({ liveAnnounce })}
              />
            </Group>

            <Group title={t('screens.voice.preferences.group-quiet')}>
              <ChoiceRow
                label={t('screens.voice.preferences.quiet-title')}
                hint={t('screens.voice.preferences.quiet-hint')}
                options={quietChoices}
                value={quiet}
                onChange={changeQuiet}
              />
              {quiet !== 'off' ? (
                <QuietDays
                  mask={preferences.quietDays}
                  onChange={(quietDays) => save({ quietDays })}
                />
              ) : null}
              <ToggleRow
                label={t('screens.voice.preferences.critical-bypass')}
                hint={t('screens.voice.preferences.critical-bypass-hint')}
                value={preferences.criticalBypass}
                onChange={(criticalBypass) => save({ criticalBypass })}
              />
              <ChoiceRow
                label={t('screens.voice.preferences.dnd-title')}
                hint={
                  resting
                    ? t('screens.voice.preferences.dnd-until', {
                        time: date.formatTime(new Date(preferences.dndUntil * 1000)),
                      })
                    : t('screens.voice.preferences.dnd-hint')
                }
                options={dndOptions}
                value={dndChoiceOf(preferences, new Date(now))}
                onChange={(choice) => save({ dndUntil: dndUntilFor(choice, new Date()) })}
              />
            </Group>

            {environments.length > 1 ? (
              <Group title={t('screens.voice.preferences.group-places')}>
                {environments.map((environment) => (
                  <ToggleRow
                    key={environment.id}
                    label={t('screens.voice.preferences.environment', { name: environment.name })}
                    value={!environmentMuted(preferences, environment.id)}
                    onChange={(calls) =>
                      save({
                        mutedEnvironmentIds: toggledEnvironments(
                          preferences,
                          environment.id,
                          !calls
                        ),
                      })
                    }
                  />
                ))}
              </Group>
            ) : null}
          </View>
        </View>
      ) : null}
    </Panel>
  );
}
