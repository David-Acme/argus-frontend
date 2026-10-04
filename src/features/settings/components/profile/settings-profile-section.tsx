import { View } from 'react-native';
import type { SettingsProfile, SettingsProfiles } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';
import { ProfileCard } from '@/features/settings/components/profile/profile-card';
import { hardwareFacts } from '@/features/settings/model/profile-text';

type SettingsProfileSectionProps = {
  profiles: SettingsProfiles | null;
  loading: boolean;
  failed: boolean;
  applying: string | null;
  onOpen: (profile: SettingsProfile) => void;
  onRetry: () => void;
};

type ProfileSkeletonProps = {
  compact: boolean;
};

const SKELETON_CARDS = ['first', 'second', 'third'] as const;

function ProfileSkeleton({ compact }: ProfileSkeletonProps) {
  return (
    <View className={compact ? 'gap-3' : 'flex-row gap-4'}>
      {SKELETON_CARDS.map((slot) => (
        <View
          key={slot}
          className={cn('bg-surface-secondary/70 rounded-3xl', compact ? 'h-20' : 'h-44 flex-1')}
        />
      ))}
    </View>
  );
}

export function SettingsProfileSection({
  profiles,
  loading,
  failed,
  applying,
  onOpen,
  onRetry,
}: SettingsProfileSectionProps) {
  const { t } = useTranslation();
  const { isCompact, isExpanded } = useWindowClass();

  const recommendation = profiles?.recommendation ?? null;

  return (
    <View className="gap-3">
      <View className={isCompact ? 'gap-2' : 'flex-row items-end justify-between gap-6'}>
        <View className="min-w-0 flex-1 gap-1">
          <Text variant="headline">{t('screens.settings.profiles.title')}</Text>
          <Text variant="caption" className="text-foreground-secondary">
            {t('screens.settings.profiles.subtitle')}
          </Text>
        </View>
        {recommendation ? (
          <View
            accessibilityLabel={t('screens.settings.profiles.hardware.label')}
            className={cn(
              'flex-row flex-wrap items-center gap-1.5',
              isCompact ? '' : 'max-w-[60%] justify-end'
            )}>
            <Icon name="monitor" className="text-muted-foreground size-3.5" />
            {hardwareFacts(recommendation.hardware).map((fact) => (
              <StatusBadge key={fact} label={fact} />
            ))}
          </View>
        ) : null}
      </View>

      {profiles ? (
        <View className={isCompact ? 'gap-3' : 'flex-row items-stretch gap-4'}>
          {profiles.profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              recommendation={recommendation}
              compact={isCompact}
              detailed={isExpanded}
              applying={applying === profile.id}
              onOpen={onOpen}
            />
          ))}
        </View>
      ) : failed ? (
        <View className="bg-card flex-row flex-wrap items-center gap-3 rounded-3xl px-4 py-3.5 shadow-md shadow-black/[0.05]">
          <Icon name="triangle-alert" className="text-warning-strong size-4" />
          <Text variant="caption" className="min-w-48 flex-1">
            {t('screens.settings.profiles.load-error')}
          </Text>
          <Button size="sm" variant="outline" onPress={onRetry}>
            <Text>{t('common.retry')}</Text>
          </Button>
        </View>
      ) : loading ? (
        <ProfileSkeleton compact={isCompact} />
      ) : null}
    </View>
  );
}
