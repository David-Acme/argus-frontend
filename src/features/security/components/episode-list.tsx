import { useMemo } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardCameraContext, GuardEpisode, GuardFeedbackLabel } from '@/core/types';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { EpisodeCard } from '@/features/security/components/episode-card';
import { episodeKey } from '@/features/security/model/episode';
import { useTranslation } from '@/shared/hooks/use-translation';

type EpisodeListProps = {
  episodes: readonly GuardEpisode[];
  cameras: readonly ICameraCacheRow[];
  contexts: readonly GuardCameraContext[];
  onReview?: (episode: GuardEpisode, label: GuardFeedbackLabel) => void;
};

export function EpisodeList({ episodes, cameras, contexts, onReview }: EpisodeListProps) {
  const { t } = useTranslation();
  const names = useMemo(() => new Map(cameras.map((camera) => [camera.id, camera.name])), [cameras]);
  const byCamera = useMemo(
    () => new Map(contexts.map((context) => [context.cameraId, context])),
    [contexts]
  );

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
    <View className="-mx-3 min-h-56 gap-1">
      {episodes.map((episode) => (
        <EpisodeCard
          key={episodeKey(episode)}
          episode={episode}
          cameraName={
            names.get(String(episode.cameraId)) ??
            (episode.cameraName ||
              t('screens.security.cameras.edit-title', { name: String(episode.cameraId) }))
          }
          context={byCamera.get(episode.cameraId) ?? null}
          onReview={onReview}
        />
      ))}
    </View>
  );
}
