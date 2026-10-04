import { Pressable, View } from 'react-native';
import type { ProfileRecommendation, SettingsProfile } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import {
  PROFILE_FALLBACK_ICON,
  PROFILE_ICONS,
  PROFILE_TARGETS_SHOWN,
} from '@/features/settings/constants/settings-profiles';
import { megabytes } from '@/features/settings/model/tts-preview';
import { profileCost, profileTargets } from '@/features/settings/model/settings-profiles';
import {
  profileFit,
  profileName,
  profileSummary,
  settingLabel,
  settingValueLabel,
} from '@/features/settings/model/profile-text';
import { ProfileFit } from '@/features/settings/components/profile/profile-fit';

type ProfileCardProps = {
  profile: SettingsProfile;
  recommendation: ProfileRecommendation | null;
  compact: boolean;
  detailed: boolean;
  applying: boolean;
  onOpen: (profile: SettingsProfile) => void;
};

type ProfileFootnoteProps = {
  profile: SettingsProfile;
};

function ProfileFootnote({ profile }: ProfileFootnoteProps) {
  const { t } = useTranslation();
  const cost = profileCost(profile);
  const download = megabytes(cost.downloadMb);
  const unreachable = cost.unreachable[0];

  return (
    <View className="flex-row flex-wrap items-center gap-1.5">
      <StatusBadge
        icon={cost.changes > 0 ? 'refresh-cw' : 'check'}
        label={
          cost.changes === 0
            ? t('screens.settings.profiles.no-changes')
            : cost.changes === 1
              ? t('screens.settings.profiles.changes-one')
              : t('screens.settings.profiles.changes-other', { count: String(cost.changes) })
        }
      />
      {download ? (
        <StatusBadge
          icon="download"
          label={t('screens.settings.profiles.download', { size: download })}
        />
      ) : null}
      {cost.hostOnly.length > 0 ? (
        <StatusBadge
          icon="triangle-alert"
          iconClassName="text-warning-strong"
          label={t('screens.settings.profiles.host-only')}
        />
      ) : null}
      {unreachable ? (
        <StatusBadge
          icon="wifi-off"
          label={t('screens.settings.profiles.owner-unreachable', {
            name: t(`screens.settings.owners.${unreachable}.name`),
          })}
        />
      ) : null}
    </View>
  );
}

export function ProfileCard({
  profile,
  recommendation,
  compact,
  detailed,
  applying,
  onOpen,
}: ProfileCardProps) {
  const { t } = useTranslation();
  const name = profileName(profile.labelKey);
  const fit = recommendation ? profileFit(profile.id, recommendation) : null;
  const recommended = fit?.recommended ?? false;
  const targets = profileTargets(profile).slice(0, PROFILE_TARGETS_SHOWN);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('screens.settings.profiles.open', { name })}
      accessibilityState={{ selected: profile.current, busy: applying }}
      onPress={() => onOpen(profile)}
      className={cn(
        'bg-card gap-3 rounded-3xl border p-4 shadow-md shadow-black/[0.05] active:opacity-90',
        !compact && 'flex-1',
        recommended ? 'border-accent/70' : 'web:hover:border-border border-transparent',
        applying && 'opacity-70'
      )}>
      <View className="flex-row items-start gap-3">
        <View
          className={cn(
            'size-10 items-center justify-center rounded-full',
            recommended ? 'bg-accent-soft' : 'bg-surface-secondary'
          )}>
          <Icon
            name={PROFILE_ICONS[profile.labelKey] ?? PROFILE_FALLBACK_ICON}
            className={cn(
              'size-5',
              recommended ? 'text-accent-strong' : 'text-foreground-secondary'
            )}
          />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text variant="subhead" className="font-semibold" numberOfLines={1}>
              {name}
            </Text>
            {profile.current ? (
              <StatusBadge
                icon="check-circle"
                iconClassName="text-success"
                label={t('screens.settings.profiles.current')}
              />
            ) : null}
          </View>
          <Text variant="caption" numberOfLines={compact ? 2 : 3}>
            {profileSummary(profile.labelKey)}
          </Text>
        </View>
        {compact ? (
          <Icon name="chevron-right" className="text-muted-foreground mt-2.5 size-4" />
        ) : null}
      </View>

      {fit && (fit.recommended || !compact) ? <ProfileFit fit={fit} /> : null}

      {detailed ? (
        <View className="gap-1.5">
          {targets.map((target) => (
            <View key={`${target.owner}:${target.key}`} className="flex-row items-center gap-2">
              <View
                className={cn('size-1.5 rounded-full', target.changed ? 'bg-accent' : 'bg-border')}
              />
              <Text variant="caption" numberOfLines={1} className="min-w-0 flex-1">
                {settingLabel(target.key)}
              </Text>
              <Text variant="label" numberOfLines={1} className="shrink-0">
                {settingValueLabel(target.key, target.to)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className={compact ? '' : 'flex-1 justify-end'}>
        <ProfileFootnote profile={profile} />
      </View>
    </Pressable>
  );
}
