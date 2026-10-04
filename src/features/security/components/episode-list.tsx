import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardCameraContext, GuardEnvironment, GuardEpisode, GuardFeedbackLabel } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { EpisodeCard } from '@/features/security/components/episode-card';
import { EPISODE_PAGE_SIZE } from '@/features/security/constants';
import { episodeKey } from '@/features/security/model/episode';
import { useTranslation } from '@/shared/hooks/use-translation';

type EpisodeListProps = {
  episodes: readonly GuardEpisode[];
  cameras: readonly ICameraCacheRow[];
  contexts: readonly GuardCameraContext[];
  environments?: readonly GuardEnvironment[];
  onReview?: (episode: GuardEpisode, label: GuardFeedbackLabel) => void;
};

export function EpisodeList({ episodes, cameras, contexts, environments = [], onReview }: EpisodeListProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const names = useMemo(
    () => new Map(cameras.map((camera) => [camera.id, camera.name])),
    [cameras]
  );
  const byCamera = useMemo(
    () => new Map(contexts.map((context) => [context.cameraId, context])),
    [contexts]
  );
  const places = useMemo(
    () =>
      environments.length > 1
        ? new Map(environments.map((environment) => [environment.id, environment.name]))
        : new Map<number, string>(),
    [environments]
  );
  const pageSize = onReview ? EPISODE_PAGE_SIZE.review : EPISODE_PAGE_SIZE.read;
  const hidden = Math.max(0, episodes.length - pageSize);
  const shown = showAll ? episodes : episodes.slice(0, pageSize);

  if (episodes.length === 0) {
    return (
      <EmptyState
        variant="panel"
        icon="shield-check"
        title={t('screens.security.episodes.empty')}
        hint={t('screens.security.episodes.empty-hint')}
        className="min-h-56"
      />
    );
  }

  return (
    <View className="min-h-56 gap-1">
      <View className="-mx-3 gap-1">
        {shown.map((episode) => (
          <EpisodeCard
            key={episodeKey(episode)}
            episode={episode}
            cameraName={[
              names.get(String(episode.cameraId)) ??
                (episode.cameraName ||
                  t('screens.security.cameras.edit-title', { name: String(episode.cameraId) })),
              places.get(episode.environmentId),
            ]
              .filter((part): part is string => Boolean(part))
              .join(' · ')}
            context={byCamera.get(episode.cameraId) ?? null}
            onReview={onReview}
          />
        ))}
      </View>
      {hidden > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          accessibilityState={{ expanded: showAll }}
          onPress={() => setShowAll((all) => !all)}>
          <Text>
            {showAll
              ? t('screens.security.episodes.show-less')
              : t('screens.security.episodes.show-more', { count: String(hidden) })}
          </Text>
          <Icon name={showAll ? 'chevron-up' : 'chevron-down'} />
        </Button>
      ) : null}
    </View>
  );
}
