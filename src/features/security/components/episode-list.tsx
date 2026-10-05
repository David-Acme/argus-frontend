import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type {
  GuardCameraContext,
  GuardEnvironment,
  GuardEpisode,
  GuardFeedbackLabel,
} from '@/core/types';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { useTranslation } from '@/shared/hooks/use-translation';
import { EpisodeCard } from '@/features/security/components/episode-card';
import { EPISODE_ROW_ESTIMATE } from '@/features/security/constants';
import { episodeKey } from '@/features/security/model/episode';

type EpisodeListProps = {
  episodes: readonly GuardEpisode[];
  cameras: readonly ICameraCacheRow[];
  contexts: readonly GuardCameraContext[];
  environments?: readonly GuardEnvironment[];
  paging: InfiniteListState;
  maxHeight?: number;
  onReview?: (episode: GuardEpisode, label: GuardFeedbackLabel) => void;
  onRetain?: (episode: GuardEpisode, retain: boolean) => void;
};

const NO_ENVIRONMENTS: readonly GuardEnvironment[] = [];

export function EpisodeList({
  episodes,
  cameras,
  contexts,
  environments = NO_ENVIRONMENTS,
  paging,
  maxHeight,
  onReview,
  onRetain,
}: EpisodeListProps) {
  const { t } = useTranslation();
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

  const renderEpisode = useCallback(
    (episode: GuardEpisode) => (
      <EpisodeCard
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
        onRetain={onRetain}
      />
    ),
    [byCamera, names, onRetain, onReview, places, t]
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
    <View className={maxHeight == null ? '-mx-3 min-h-56 flex-1 basis-0' : '-mx-3'}>
      <InfiniteList
        data={episodes}
        keyOf={episodeKey}
        renderItem={renderEpisode}
        estimatedItemSize={EPISODE_ROW_ESTIMATE}
        gap={4}
        paging={paging}
        maxHeight={maxHeight}
        scrollIndicator
      />
    </View>
  );
}
