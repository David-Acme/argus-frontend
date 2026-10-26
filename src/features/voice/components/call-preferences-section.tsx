import { View } from 'react-native';
import type {
  CallLanguage,
  CallMode,
  CallPreferences,
  CallPreferencesPatch,
  GuardEnvironment,
  TranslationKey,
} from '@/core/types';
import { MODULE_IDS, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { resourceOf } from '@/shared/libs/remote-resource';
import { FilterChip } from '@/shared/ui/chip';
import { Choice } from '@/shared/ui/choice';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import {
  CALL_MODE_LABEL,
  CALL_TRIGGER_TEXT,
  DAY_LABEL,
  DND_LABEL,
  QUIET_LABEL,
} from '@/features/voice/constants/call-preferences.constant';
import { useCallPreferences } from '@/features/voice/hooks/use-call-preferences';
import {
  AGENDA_LEADS,
  CALL_LANGUAGES,
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
  triggersOf,
  withCurrent,
} from '@/features/voice/model/call-preferences';
import type { DndChoice, QuietPreset } from '@/features/voice/model/call-preferences';

type Save = (patch: CallPreferencesPatch) => void;

type GroupProps = { preferences: CallPreferences; save: Save };

const MODES: readonly CallMode[] = ['call', 'notify', 'off'];
const DND_TICK_MS = 30_000;

const LANGUAGE_LABEL: Readonly<Record<CallLanguage, TranslationKey>> = {
  '': 'screens.voice.preferences.lang.account',
  es: 'screens.voice.preferences.lang.es',
  en: 'screens.voice.preferences.lang.en',
};

function WhenGroup({ preferences, save }: GroupProps) {
  const { t } = useTranslation();
  const { moduleActive } = useCapabilities();
  const modes = MODES.map((value) => ({ value, label: t(CALL_MODE_LABEL[value]) }));
  const leads = withCurrent(AGENDA_LEADS, preferences.agendaLeadMinutes).map((minutes) => ({
    value: String(minutes),
    label:
      minutes === 0
        ? t('screens.voice.preferences.at-start')
        : t('screens.voice.preferences.minutes', { count: String(minutes) }),
  }));
  return (
    <Section title={t('screens.voice.preferences.group-when')}>
      {triggersOf(moduleActive).map((trigger) => (
        <Choice<CallMode>
          key={trigger}
          label={t(CALL_TRIGGER_TEXT[trigger].label)}
          caption={t(CALL_TRIGGER_TEXT[trigger].hint)}
          options={modes}
          value={preferences[trigger]}
          onChange={(mode) => save({ [trigger]: mode })}
        />
      ))}
      {moduleActive(MODULE_IDS.productivity) ? (
        <Choice
          label={t('screens.voice.preferences.agenda-lead')}
          caption={t('screens.voice.preferences.agenda-lead-hint')}
          options={leads}
          value={String(preferences.agendaLeadMinutes)}
          onChange={(value) => save({ agendaLeadMinutes: Number(value) })}
        />
      ) : null}
    </Section>
  );
}

function HowGroup({ preferences, save }: GroupProps) {
  const { t } = useTranslation();
  const seconds = (value: number) =>
    t('screens.voice.preferences.seconds', { count: String(value) });
  const ring = withCurrent(RING_SECONDS, preferences.ringSeconds).map((value) => ({
    value: String(value),
    label: seconds(value),
  }));
  const delays = withCurrent(PUSH_DELAYS, preferences.pushDelaySeconds).map((value) => ({
    value: String(value),
    label: value === 0 ? t('screens.voice.preferences.at-once') : seconds(value),
  }));
  const languages = CALL_LANGUAGES.map((value) => ({ value, label: t(LANGUAGE_LABEL[value]) }));
  return (
    <Section title={t('screens.voice.preferences.group-how')}>
      <Choice
        label={t('screens.voice.preferences.ring')}
        caption={t('screens.voice.preferences.ring-hint')}
        options={ring}
        value={String(preferences.ringSeconds)}
        onChange={(value) => save({ ringSeconds: Number(value) })}
      />
      <Choice
        label={t('screens.voice.preferences.push-delay')}
        caption={t('screens.voice.preferences.push-delay-hint')}
        options={delays}
        value={String(preferences.pushDelaySeconds)}
        onChange={(value) => save({ pushDelaySeconds: Number(value) })}
      />
      <Choice<CallLanguage>
        label={t('screens.voice.preferences.lang-title')}
        caption={t('screens.voice.preferences.lang-hint')}
        options={languages}
        value={preferences.lang}
        onChange={(lang) => save({ lang })}
      />
      <Row
        title={t('screens.voice.preferences.live-announce')}
        meta={t('screens.voice.preferences.live-announce-hint')}
        trailing={
          <Switch
            label={t('screens.voice.preferences.live-announce')}
            value={preferences.liveAnnounce}
            onValueChange={(liveAnnounce) => save({ liveAnnounce })}
          />
        }
      />
    </Section>
  );
}

function QuietDays({ preferences, save }: GroupProps) {
  const { t } = useTranslation();
  return (
    <View className="px-row-x py-row-y gap-2">
      <Text variant="rowTitle">{t('screens.voice.preferences.quiet-days')}</Text>
      <Text variant="rowMeta">{t('screens.voice.preferences.quiet-days-hint')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {WEEK_DAYS.map((day) => (
          <FilterChip
            key={day}
            label={t(DAY_LABEL[day])}
            selected={quietDayOn(preferences.quietDays, day)}
            onPress={() => save({ quietDays: toggledQuietDay(preferences.quietDays, day) })}
          />
        ))}
      </View>
    </View>
  );
}

function QuietGroup({ preferences, save }: GroupProps) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormatter();
  const { moduleActive } = useCapabilities();
  const now = useNow(DND_TICK_MS);
  const quiet = quietPresetOf(preferences);
  const presets = (['off', 'night', 'late'] as const).map((value) => ({
    value,
    label: t(QUIET_LABEL[value]),
  }));
  const custom = {
    value: 'custom' as const,
    label: t('screens.voice.preferences.quiet.custom', {
      from: String(preferences.quietStartHour),
      to: String(preferences.quietEndHour),
    }),
  };
  const dnd = (['off', 'hour', 'morning'] as const).map((value) => ({
    value,
    label: t(DND_LABEL[value]),
  }));
  return (
    <Section title={t('screens.voice.preferences.group-quiet')}>
      <Choice<QuietPreset>
        label={t('screens.voice.preferences.quiet-title')}
        caption={t('screens.voice.preferences.quiet-hint')}
        options={quiet === 'custom' ? [...presets, custom] : presets}
        value={quiet}
        onChange={(preset) => (preset === 'custom' ? undefined : save(quietHoursFor(preset)))}
      />
      {quiet !== 'off' ? <QuietDays preferences={preferences} save={save} /> : null}
      {moduleActive(MODULE_IDS.surveillance) ? (
        <Row
          title={t('screens.voice.preferences.critical-bypass')}
          meta={t('screens.voice.preferences.critical-bypass-hint')}
          trailing={
            <Switch
              label={t('screens.voice.preferences.critical-bypass')}
              value={preferences.criticalBypass}
              onValueChange={(criticalBypass) => save({ criticalBypass })}
            />
          }
        />
      ) : null}
      <Choice<DndChoice>
        label={t('screens.voice.preferences.dnd-title')}
        caption={
          dndActive(preferences, now)
            ? t('screens.voice.preferences.dnd-until', {
                time: formatTime(new Date(preferences.dndUntil * 1000)),
              })
            : t('screens.voice.preferences.dnd-hint')
        }
        options={dnd}
        value={dndChoiceOf(preferences, new Date(now))}
        onChange={(choice) => save({ dndUntil: dndUntilFor(choice, new Date()) })}
      />
    </Section>
  );
}

function PlacesGroup({ preferences, save }: GroupProps) {
  const { t } = useTranslation();
  const { moduleActive } = useCapabilities();
  const environments =
    useViewCacheValue<GuardEnvironment[]>(VIEW_CACHE_KEYS.guardEnvironments) ?? [];
  if (!moduleActive(MODULE_IDS.surveillance) || environments.length < 2) return null;
  return (
    <Section title={t('screens.voice.preferences.group-places')}>
      {environments.map((environment) => {
        const label = t('screens.voice.preferences.environment', { name: environment.name });
        return (
          <Row
            key={environment.id}
            title={label}
            trailing={
              <Switch
                label={label}
                value={!environmentMuted(preferences, environment.id)}
                onValueChange={(calls) =>
                  save({
                    mutedEnvironmentIds: toggledEnvironments(preferences, environment.id, !calls),
                  })
                }
              />
            }
          />
        );
      })}
    </Section>
  );
}

export function CallPreferencesSection() {
  const { t } = useTranslation();
  const { preferences, status, update, reload } = useCallPreferences();
  const copy = useResourceCopy({ title: t('screens.voice.preferences.load-error') });
  const save: Save = (patch) => void update(patch);
  return (
    <ResourceView
      resource={resourceOf({ data: preferences, status, retry: reload })}
      copy={copy}
      skeleton={
        <Section>
          <SkeletonRow trailing />
          <SkeletonRow />
          <SkeletonRow />
        </Section>
      }
      empty={{
        message: t('screens.voice.preferences.load-error'),
        action: { label: t('common.retry'), onPress: reload },
      }}>
      {(current) => (
        <>
          <Section>
            <Row
              title={t('screens.voice.preferences.enabled')}
              meta={t('screens.voice.preferences.enabled-hint')}
              trailing={
                <Switch
                  label={t('screens.voice.preferences.enabled')}
                  value={current.enabled}
                  onValueChange={(enabled) => save({ enabled })}
                />
              }
            />
          </Section>
          {current.enabled ? (
            <>
              <WhenGroup preferences={current} save={save} />
              <HowGroup preferences={current} save={save} />
              <QuietGroup preferences={current} save={save} />
              <PlacesGroup preferences={current} save={save} />
            </>
          ) : null}
        </>
      )}
    </ResourceView>
  );
}
