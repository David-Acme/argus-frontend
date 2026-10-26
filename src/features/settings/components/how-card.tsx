import { View } from 'react-native';
import type { SettingsProfile, SettingsProfiles } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useResourceCopy } from '@/shared/hooks/use-resource-copy';
import { useTranslation } from '@/shared/hooks/use-translation';
import { resourceOf } from '@/shared/libs/remote-resource';
import { toast } from '@/shared/libs/toast';
import { size } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Choice } from '@/shared/ui/choice';
import { Meter } from '@/shared/ui/meter';
import { Presence } from '@/shared/ui/presence';
import { ResourceView, SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import { LEVEL_LABEL, METER_LABEL, METERS } from '@/features/settings/constants/services.constant';
import type { useSettingsProfiles } from '@/features/settings/hooks/use-settings-profiles';
import {
  currentProfileId,
  isProfileLevel,
  levelFraction,
  profileLineOf,
} from '@/features/settings/model/profile-meters';
import { profileName } from '@/features/settings/model/profile-text';
import { canApply } from '@/features/settings/model/settings-profiles';

type Profiles = ReturnType<typeof useSettingsProfiles>;

type HowCardProps = { profiles: Profiles };

type BodyProps = { data: SettingsProfiles; profiles: Profiles };

type MetersProps = { data: SettingsProfiles };

function useLine(data: SettingsProfiles): string {
  const { t } = useTranslation();
  const line = profileLineOf(data);
  const current = data.profiles.find((profile) => profile.current);
  if (line === 'custom' || !current) return t('screens.settings.how.line-custom');
  const name = profileName(current.labelKey);
  return line === 'recommended'
    ? t('screens.settings.how.line-recommended', { name })
    : t('screens.settings.how.line-other', { name });
}

function Meters({ data }: MetersProps) {
  const { t } = useTranslation();
  const current = currentProfileId(data) ?? data.recommendation.profile;
  if (!isProfileLevel(current)) return null;
  return (
    <View className="mt-4 flex-row gap-3">
      {METERS.map((meter) => (
        <View key={meter} className="min-w-0 flex-1 gap-1">
          <Text variant="caption" tone="3">
            {t(METER_LABEL[meter])}
          </Text>
          <Text variant="label">{t(LEVEL_LABEL[meter][current])}</Text>
          <Meter fraction={levelFraction(current)} label={t(METER_LABEL[meter])} />
        </View>
      ))}
    </View>
  );
}

function FirstRun({ data, profiles }: BodyProps) {
  const { t } = useTranslation();
  const { formatDayMonth } = useDateFormatter();
  const run = data.firstRun;
  if (run?.state !== 'applied') return null;
  return (
    <Row
      title={t('screens.settings.first-run.title', {
        name: profileName(run.profile),
        date: formatDayMonth(new Date(run.appliedAt * 1000)),
      })}
      trailing={
        <Button
          compact
          variant="ghost"
          label={t('screens.settings.first-run.revert')}
          busy={profiles.reverting}
          onPress={() => profiles.revert()}
        />
      }
    />
  );
}

function Body({ data, profiles }: BodyProps) {
  const { t } = useTranslation();
  const line = useLine(data);
  const levels = data.profiles.filter((profile) => isProfileLevel(profile.id));
  const current = data.profiles.find((profile) => profile.current) ?? null;
  const choose = (id: string) => {
    const next = levels.find((profile) => profile.id === id);
    if (!next) return;
    if (!canApply(next)) {
      toast.error(t('screens.settings.how.needs-host'));
      return;
    }
    void profiles.apply(next, current);
  };
  const options = levels.map((profile: SettingsProfile) => ({
    value: profile.id,
    label: profileName(profile.labelKey),
  }));
  return (
    <Section>
      <View className="px-row-x py-row-y">
        <View className="flex-row items-center gap-3">
          <Presence state="idle" size={size.presenceNotice} paused />
          <View className="min-w-0 flex-1">
            <Text variant="headline" heading={2}>
              {t('screens.settings.how.title')}
            </Text>
            <Text variant="meta" tone="2">
              {line}
            </Text>
          </View>
        </View>
        {options.length > 1 ? (
          <View className="mt-4">
            <Choice
              label={t('screens.settings.how.label')}
              look="field"
              options={options}
              value={current?.id ?? data.recommendation.profile}
              onChange={choose}
            />
          </View>
        ) : null}
        <Meters data={data} />
      </View>
      <FirstRun data={data} profiles={profiles} />
    </Section>
  );
}

export function HowCard({ profiles }: HowCardProps) {
  const { t } = useTranslation();
  const copy = useResourceCopy({ title: t('screens.settings.profiles.load-error') });
  const resource = resourceOf({
    data: profiles.profiles,
    status: profiles.failed ? 'failed' : 'loading',
    retry: profiles.reload,
  });
  return (
    <ResourceView
      resource={resource}
      copy={copy}
      skeleton={
        <Section>
          <SkeletonRow />
          <SkeletonRow short />
        </Section>
      }
      empty={{
        message: t('screens.settings.profiles.load-error'),
        action: { label: t('common.retry'), onPress: profiles.reload },
      }}>
      {(data) => <Body data={data} profiles={profiles} />}
    </ResourceView>
  );
}
