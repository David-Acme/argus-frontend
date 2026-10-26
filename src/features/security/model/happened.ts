import type { GuardEpisode } from '@/core/types';
import type { AvatarTone } from '@/shared/ui/avatar';
import type { IconGlyph } from '@/shared/ui/icon';
import { episodeKey, episodeTitle, needsReview } from '@/features/security/model/episode';
import { feedWhen, type MomentFormat } from '@/features/security/model/moment';

export type HappenedItem = {
  key: string;
  episode: GuardEpisode;
  title: string;
  where: string;
  when: string;
  icon: IconGlyph;
  tone: AvatarTone;
  review: boolean;
};

export type HappenedInput = {
  now: number;
  format: MomentFormat;
  canReview: boolean;
  cameraName: (episode: GuardEpisode) => string;
};

export type HappenedStatus = 'loading' | 'ready' | 'empty' | 'failed';

export const HAPPENED_PHONE = 3;

export const HAPPENED_COLUMN = 8;

export const HAPPENED_COLUMN_WIDE = 12;

function glyphOf(episode: GuardEpisode): IconGlyph {
  if (episode.kind === 'camera') return 'eyeoff';
  return episode.notified ? 'alert' : 'user';
}

export function happenedItems(
  episodes: readonly GuardEpisode[],
  input: HappenedInput
): HappenedItem[] {
  const pending = (episode: GuardEpisode) => input.canReview && needsReview(episode);
  return [...episodes]
    .sort(
      (left, right) =>
        Number(pending(right)) - Number(pending(left)) || right.lastSeen - left.lastSeen
    )
    .map((episode) => {
      const icon = glyphOf(episode);
      return {
        key: episodeKey(episode),
        episode,
        title: episodeTitle(input.format.t, episode),
        where: input.cameraName(episode),
        when: feedWhen(episode.lastSeen * 1000, input.now, input.format),
        icon,
        tone: icon === 'user' ? 'default' : 'attn',
        review: pending(episode),
      };
    });
}

export function happenedStatus(
  count: number,
  feed: 'idle' | 'loading' | 'ready' | 'failed'
): HappenedStatus {
  if (count > 0) return 'ready';
  if (feed === 'ready') return 'empty';
  return feed === 'failed' ? 'failed' : 'loading';
}

export function cameraNameOf(
  names: ReadonlyMap<string, string>
): (episode: Pick<GuardEpisode, 'cameraId' | 'cameraName'>) => string {
  return (episode) => names.get(String(episode.cameraId)) ?? episode.cameraName;
}
