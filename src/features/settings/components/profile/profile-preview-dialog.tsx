import { View } from 'react-native';
import type {
  ProfileChange,
  ProfileOwnerPreview,
  ProfileRecommendation,
  SettingsProfile,
} from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { SETTINGS_OWNER_ICONS } from '@/features/settings/components/settings-owner-list';
import { megabytes } from '@/features/settings/model/tts-preview';
import { canApply, profileCost } from '@/features/settings/model/settings-profiles';
import {
  profileFit,
  profileName,
  profileSummary,
  settingLabel,
  settingValueLabel,
} from '@/features/settings/model/profile-text';
import { ProfileFit } from '@/features/settings/components/profile/profile-fit';

type ProfilePreviewDialogProps = {
  profile: SettingsProfile | null;
  recommendation: ProfileRecommendation | null;
  onApply: (profile: SettingsProfile) => void;
  onClose: () => void;
};

type ProfileChangeRowProps = {
  change: ProfileChange;
};

type ProfileOwnerBlockProps = {
  owner: ProfileOwnerPreview;
};

type ProfileNoteProps = {
  icon: 'download' | 'refresh-cw' | 'phone' | 'check-circle';
  text: string;
};

function ProfileChangeRow({ change }: ProfileChangeRowProps) {
  const { t } = useTranslation();
  const install = change.install;
  const size = install ? megabytes(install.sizeMb) : '';

  return (
    <View className="gap-1.5 py-2.5">
      <Text variant="label">{settingLabel(change.key)}</Text>
      <View className="flex-row flex-wrap items-center gap-2">
        <Text variant="caption" className="text-foreground-secondary">
          {settingValueLabel(change.key, change.from)}
        </Text>
        <Icon name="chevron-right" className="text-muted-foreground size-3.5" />
        <Text variant="label" className="text-accent-strong">
          {settingValueLabel(change.key, change.to)}
        </Text>
        {install?.availability === 'installable' || install?.availability === 'failed' ? (
          <StatusBadge
            icon="download"
            label={t('screens.settings.profiles.download', { size: size || '0' })}
          />
        ) : null}
        {install?.availability === 'installing' ? (
          <StatusBadge icon="loader-circle" label={t('screens.settings.install.installing')} />
        ) : null}
        {install?.availability === 'hostOnly' ? (
          <StatusBadge
            icon="triangle-alert"
            iconClassName="text-warning-strong"
            label={t('screens.settings.profiles.preview.host-title')}
          />
        ) : null}
      </View>
    </View>
  );
}

function ProfileOwnerBlock({ owner }: ProfileOwnerBlockProps) {
  const { t } = useTranslation();
  const changes = owner.changes.filter((change) => change.changed);

  return (
    <View className="bg-surface-secondary dark:bg-card-secondary gap-1 rounded-2xl px-4 py-3">
      <View className="flex-row items-center gap-2.5">
        <Icon
          name={SETTINGS_OWNER_ICONS[owner.service]}
          className="text-foreground-secondary size-4"
        />
        <Text variant="label" className="flex-1">
          {t(`screens.settings.owners.${owner.service}.name`)}
        </Text>
        {owner.reachable ? null : <Icon name="wifi-off" className="text-muted-foreground size-4" />}
      </View>
      {owner.reachable ? null : (
        <Text variant="caption">{t('screens.settings.profiles.preview.owner-unreachable')}</Text>
      )}
      <View className="divide-border-subtle divide-y">
        {changes.map((change) => (
          <ProfileChangeRow key={change.key} change={change} />
        ))}
      </View>
    </View>
  );
}

function ProfileNote({ icon, text }: ProfileNoteProps) {
  return (
    <View className="flex-row items-start gap-2">
      <Icon name={icon} className="text-muted-foreground mt-0.5 size-3.5" />
      <Text variant="caption" className="flex-1">
        {text}
      </Text>
    </View>
  );
}

export function ProfilePreviewDialog({
  profile,
  recommendation,
  onApply,
  onClose,
}: ProfilePreviewDialogProps) {
  const { t } = useTranslation();
  const fit = profile && recommendation ? profileFit(profile.id, recommendation) : null;
  const cost = profile ? profileCost(profile) : null;
  const owners = profile
    ? profile.owners.filter((owner) => owner.changes.some((change) => change.changed))
    : [];
  const applicable = profile ? canApply(profile) : false;
  const download = cost ? megabytes(cost.downloadMb) : '';

  return (
    <AdaptiveDialog
      open={profile !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={profile ? profileName(profile.labelKey) : ''}
      description={profile ? profileSummary(profile.labelKey) : undefined}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={onClose}>
            <Text>{t('screens.settings.profiles.preview.cancel')}</Text>
          </Button>
          <Button disabled={!applicable} onPress={() => profile && onApply(profile)}>
            <Text>
              {applicable
                ? t('screens.settings.profiles.preview.apply')
                : t('screens.settings.profiles.preview.applied')}
            </Text>
          </Button>
        </>
      }>
      {profile && cost ? (
        <View className="gap-3">
          {fit ? <ProfileFit fit={fit} /> : null}

          {owners.length === 0 ? (
            <ProfileNote
              icon="check-circle"
              text={t('screens.settings.profiles.preview.already')}
            />
          ) : (
            <>
              <Text variant="caption">{t('screens.settings.profiles.preview.description')}</Text>
              {owners.map((owner) => (
                <ProfileOwnerBlock key={owner.service} owner={owner} />
              ))}
            </>
          )}

          {cost.hostOnly.length > 0 ? (
            <View className="border-warning/40 gap-2 rounded-2xl border px-3 py-2.5">
              <View className="flex-row items-center gap-2">
                <Icon name="triangle-alert" className="text-warning-strong size-4" />
                <Text variant="label">{t('screens.settings.profiles.preview.host-title')}</Text>
              </View>
              <Text variant="caption">{t('screens.settings.profiles.preview.host-hint')}</Text>
              {cost.hostOnly.map((change) => (
                <View
                  key={`${change.owner}:${change.key}`}
                  className="bg-surface-secondary rounded-xl px-3 py-2">
                  <Text variant="micro" selectable className="text-foreground font-mono">
                    {change.install?.hostCommand}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {owners.length > 0 ? (
            <View className="gap-1.5">
              {cost.unchanged > 0 ? (
                <ProfileNote
                  icon="check-circle"
                  text={
                    cost.unchanged === 1
                      ? t('screens.settings.profiles.preview.unchanged-one')
                      : t('screens.settings.profiles.preview.unchanged-other', {
                          count: String(cost.unchanged),
                        })
                  }
                />
              ) : null}
              {download ? (
                <ProfileNote
                  icon="download"
                  text={t('screens.settings.profiles.preview.download', { size: download })}
                />
              ) : null}
              {cost.restart ? (
                <ProfileNote
                  icon="refresh-cw"
                  text={t('screens.settings.profiles.preview.restart')}
                />
              ) : null}
              {cost.nextSession ? (
                <ProfileNote
                  icon="phone"
                  text={t('screens.settings.profiles.preview.next-session')}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </AdaptiveDialog>
  );
}
