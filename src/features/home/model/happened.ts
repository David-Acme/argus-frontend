import type { GuardEpisode } from '@/core/types';
import type { MomentFormat } from '@/features/home/model/camera-moments';
import { rowMoment } from '@/features/home/model/camera-moments';

export type HappenedIcon = 'alert' | 'user' | 'eyeoff';

export type HappenedRow = {
  key: string;
  title: string;
  meta: string;
  icon: HappenedIcon;
  attention: boolean;
  review: boolean;
};

export type HappenedInput = {
  limit: number;
  now: number;
  format: MomentFormat;
  canReview: boolean;
  pending: (episode: GuardEpisode) => boolean;
  titleOf: (episode: GuardEpisode) => string;
};

export const HAPPENED_LIMIT = 3;

function iconOf(episode: Pick<GuardEpisode, 'kind' | 'notified'>): HappenedIcon {
  if (episode.kind === 'camera') return 'eyeoff';
  return episode.notified ? 'alert' : 'user';
}

export function happenedRows(
  episodes: readonly GuardEpisode[],
  input: HappenedInput
): HappenedRow[] {
  const review = (episode: GuardEpisode) => input.canReview && input.pending(episode);
  const ordered = [...episodes].sort(
    (left, right) => Number(review(right)) - Number(review(left)) || right.lastSeen - left.lastSeen
  );
  return ordered.slice(0, input.limit).map((episode) => {
    const icon = iconOf(episode);
    return {
      key: `${episode.kind}-${episode.id}`,
      title: input.titleOf(episode),
      meta: [episode.cameraName, rowMoment(episode.lastSeen * 1000, input.now, input.format)]
        .filter(Boolean)
        .join(' · '),
      icon,
      attention: icon !== 'user',
      review: review(episode),
    };
  });
}

export type HappenedStatus = 'loading' | 'ready' | 'empty' | 'failed';

export function happenedStatus(
  count: number,
  feed: 'idle' | 'loading' | 'ready' | 'failed'
): HappenedStatus {
  if (count > 0) return 'ready';
  if (feed === 'ready') return 'empty';
  return feed === 'failed' ? 'failed' : 'loading';
}
