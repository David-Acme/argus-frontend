import { guardService } from '@/core/services/guard.service';
import type { GuardEpisodeDetail, ResourceMatch } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { timelineRaised, timelineText } from '@/features/security/model/timeline';

type EpisodeTimelineProps = { episodeId: number };

const SKELETON = [0, 1, 2];

export function EpisodeTimeline({ episodeId }: EpisodeTimelineProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const resources: readonly ResourceMatch[] = [
    { domain: 'guard', scope: 'episodes', id: episodeId },
  ];
  const detail = useRemoteResource<GuardEpisodeDetail>({
    cacheKey: VIEW_CACHE_KEYS.guardEpisode,
    scope: String(episodeId),
    load: () => guardService.episode(episodeId),
    resources,
  });
  if (detail.data == null && detail.status === 'failed')
    return (
      <Notice
        inline
        tone="attention"
        icon="wifioff"
        title={t('screens.security.episodes.timeline-error')}
        action={{ label: t('common.retry'), onPress: detail.reload }}
      />
    );
  if (detail.data == null) return SKELETON.map((index) => <SkeletonRow key={index} short />);
  return detail.data.timeline.map((entry, index) => (
    <Row
      key={`${entry.type}-${entry.at}-${index}`}
      title={timelineText(entry, t)}
      meta={date.formatTime(new Date(entry.at * 1000))}
      metaTone={timelineRaised(entry) ? 'alert' : undefined}
    />
  ));
}
