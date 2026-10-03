import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { GuardClosedMode, GuardSite, GuardSitePatch, GuardSiteProfile } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { HoursEditor } from '@/features/security/components/hours-editor';
import {
  DIGEST_HOUR_OPTIONS,
  SITE_PROFILE_ICONS,
  SITE_PROFILES,
  WEEK_DAY_KEYS,
} from '@/features/security/constants';
import { parseHours, summarizeHours } from '@/features/security/model/hours';
import {
  SITE_HOURS_BY_PROFILE,
  SITE_PRESETS,
  type SiteHoursKind,
} from '@/features/security/model/site-presets';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type SitePanelProps = {
  site: GuardSite | null;
  onUpdate: (patch: GuardSitePatch) => Promise<boolean>;
  className?: string;
};

type HoursRowProps = {
  kind: SiteHoursKind;
  summary: string | null;
  onPress: () => void;
};

const rowHover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

function HoursRow({ kind, summary, onPress }: HoursRowProps) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`screens.security.site.hours.${kind}`)}
      accessibilityHint={t(`screens.security.site.hours-hint.${kind}`)}
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
      <Icon name="chevron-right" className="text-muted-foreground size-4" />
    </Pressable>
  );
}

export function SitePanel({ site, onUpdate, className }: SitePanelProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<SiteHoursKind | null>(null);
  const profile: GuardSiteProfile = site?.profile ?? 'home';
  const kinds = SITE_HOURS_BY_PROFILE[profile];
  const hasHours = kinds.some((kind) => (site?.[kind] ?? '').trim().length > 0);

  const profileOptions = useMemo(
    () =>
      SITE_PROFILES.map((value) => ({
        value,
        label: t(`screens.security.site.profiles.${value}`),
        icon: SITE_PROFILE_ICONS[value],
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

  const summary = (kind: SiteHoursKind): string | null => {
    const windows = parseHours(site?.[kind] ?? '');
    if (windows.length === 0) return null;
    return summarizeHours(windows, {
      day: (day) => t(`screens.security.site.days.${WEEK_DAY_KEYS[day] ?? 'mon'}`),
      everyDay: t('screens.security.site.every-day'),
    });
  };

  const applyPreset = () => void onUpdate({ ...SITE_PRESETS[profile], scheduleEnabled: true });

  const saveHours = (kind: SiteHoursKind, spec: string) => {
    const patch: GuardSitePatch = {};
    patch[kind] = spec;
    return onUpdate(patch);
  };

  const digestValue = String(site?.digestHour ?? -1);

  return (
    <Panel
      title={t('screens.security.site.title')}
      description={t('screens.security.site.description')}
      className={className}>
      <View className="gap-1.5">
        <SegmentedControl
          options={profileOptions}
          value={profile}
          onChange={(next) => void onUpdate({ profile: next })}
          accessibilityLabel={t('screens.security.site.profile')}
        />
        <Text variant="caption" className="px-1">
          {t(`screens.security.site.profile-hint.${profile}`)}
        </Text>
      </View>
      <ToggleRow
        label={t('screens.security.site.schedule')}
        hint={t('screens.security.site.schedule-hint')}
        value={site?.scheduleEnabled ?? false}
        disabled={site == null}
        onChange={(next) => void onUpdate({ scheduleEnabled: next })}
      />
      <View className={cn('gap-0.5', site?.scheduleEnabled === false && 'opacity-60')}>
        {kinds.map((kind) => (
          <HoursRow key={kind} kind={kind} summary={summary(kind)} onPress={() => setEditing(kind)} />
        ))}
      </View>
      {!hasHours ? (
        <Button variant="secondary" size="sm" className="self-start" onPress={applyPreset}>
          <Icon name="sparkles" />
          <Text>{t('screens.security.site.preset')}</Text>
        </Button>
      ) : null}
      {profile !== 'home' ? (
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.site.closed')}</Text>
          <SegmentedControl<GuardClosedMode>
            options={closedOptions}
            value={site?.closedMode ?? 'away'}
            onChange={(next) => void onUpdate({ closedMode: next })}
            accessibilityLabel={t('screens.security.site.closed')}
          />
          <Text variant="caption" className="px-1">
            {t('screens.security.site.closed-hint')}
          </Text>
        </View>
      ) : null}
      <View className="gap-1.5">
        <Text variant="label">{t('screens.security.site.digest')}</Text>
        <AdaptiveSelect
          options={digestOptions}
          value={digestValue}
          onChange={(next) => void onUpdate({ digestHour: Number(next) })}
          title={t('screens.security.site.digest')}
          closeLabel={t('common.close')}
          searchPlaceholder={t('screens.security.hours.pick-time')}
          emptyLabel={t('screens.security.hours.pick-time')}
          filterThreshold={digestOptions.length + 1}
          trigger={
            <SelectField
              label={digestOptions.find((option) => option.value === digestValue)?.label}
              disabled={site == null}
            />
          }
        />
        <Text variant="caption" className="px-1">
          {t('screens.security.site.digest-hint')}
        </Text>
      </View>
      {editing ? (
        <HoursEditor
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          title={t('screens.security.hours.title', { kind: t(`screens.security.site.hours.${editing}`) })}
          description={t(`screens.security.site.hours-hint.${editing}`)}
          spec={site?.[editing] ?? ''}
          onSave={(spec) => saveHours(editing, spec)}
        />
      ) : null}
    </Panel>
  );
}
