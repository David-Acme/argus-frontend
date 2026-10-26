import { t } from '@/core/i18n';
import type { IServiceResponse } from '@/core/interfaces';
import { guardService } from '@/core/services/guard.service';
import type { GuardEpisode, GuardFeedbackLabel } from '@/core/types';
import { runServiceAction } from '@/shared/libs/service-action';
import { useEpisodeFeed } from '@/features/security/hooks/use-episode-feed';
import { retainedEpisode, reviewedEpisode, withEpisode } from '@/features/security/model/episode';

type EpisodeChange = {
  next: GuardEpisode;
  call: () => Promise<IServiceResponse<GuardEpisode>>;
  success: string;
};

export function useEpisodes(environmentId: number | undefined, enabled: boolean) {
  const feed = useEpisodeFeed(environmentId, enabled);

  async function change(before: GuardEpisode, { next, call, success }: EpisodeChange) {
    feed.mutate((rows) => withEpisode(rows, next));
    const result = await runServiceAction({ call, success });
    const settled = result?.info ?? before;
    feed.mutate((rows) => withEpisode(rows, settled));
    return result !== null;
  }

  const review = (episode: GuardEpisode, label: GuardFeedbackLabel) =>
    change(episode, {
      next: reviewedEpisode(episode, label, Date.now()),
      call: () => guardService.reviewEpisode(episode.id, label),
      success: t('screens.security.episodes.review-saved'),
    });

  const retain = (episode: GuardEpisode, keep: boolean) =>
    change(episode, {
      next: retainedEpisode(episode, keep),
      call: () => guardService.retainEpisode(episode.id, keep),
      success: t(
        keep
          ? 'screens.security.episodes.retain-saved'
          : 'screens.security.episodes.retain-released'
      ),
    });

  return {
    rows: feed.rows,
    status: feed.status,
    hasMore: feed.hasMore,
    loadMore: feed.loadMore,
    reload: feed.reload,
    review,
    retain,
  };
}
