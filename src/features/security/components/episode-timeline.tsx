import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { GuardDanger, GuardTimelineEntry } from '@/core/types';
import { guardService } from '@/core/services/guard.service';
import { Text } from '@/shared/components/ui/text';
import { TimelineItem } from '@/shared/components/ui/timeline';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type EpisodeTimelineProps = {
  episodeId: number;
};

type TimelineLineProps = {
  entry: GuardTimelineEntry;
  last: boolean;
};

const SENT = new Set(['succeeded', 'duplicate_succeeded', 'in_flight', 'pending', 'indeterminate']);

function useEntryText() {
  const { t } = useTranslation();
  return (entry: GuardTimelineEntry): string => {
    const danger = (value: GuardDanger) => t(`screens.security.danger.${value}`).toLowerCase();
    if (entry.type === 'state') {
      if (entry.state === 'closed')
        return entry.reason === 'known_resident'
          ? t('screens.security.episodes.timeline.known-resident')
          : t('screens.security.episodes.timeline.stale');
      if (entry.state === 'escalating') return t('screens.security.episodes.timeline.escalating');
      if (entry.state === 'observing') return t('screens.security.episodes.timeline.observing');
      return t('screens.security.episodes.timeline.verifying');
    }
    if (entry.type === 'decision') {
      const times =
        entry.count > 1
          ? ` ${t('screens.security.episodes.timeline.times', { count: String(entry.count) })}`
          : '';
      if (entry.notified)
        return (
          t('screens.security.episodes.timeline.decision-alerted', {
            danger: danger(entry.danger),
          }) + times
        );
      switch (entry.suppression) {
        case 'thread_suppressed':
          return t('screens.security.episodes.timeline.decision-repeat') + times;
        case 'grouped':
          return t('screens.security.episodes.timeline.decision-grouped') + times;
        case 'held':
          return t('screens.security.episodes.timeline.decision-held') + times;
        case 'staging':
          return t('screens.security.episodes.timeline.decision-staging') + times;
        case 'budget':
          return t('screens.security.episodes.timeline.decision-budget') + times;
        case 'belief_gate':
          return t('screens.security.episodes.timeline.decision-belief') + times;
        default:
          return (
            t('screens.security.episodes.timeline.decision-silent', {
              danger: danger(entry.danger),
            }) + times
          );
      }
    }
    const sent = SENT.has(entry.status);
    switch (entry.action) {
      case 'notify':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-notify'
            : 'screens.security.episodes.timeline.failed-notify'
        );
      case 'announce':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-announce'
            : 'screens.security.episodes.timeline.failed-announce'
        );
      case 'greet':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-greet'
            : 'screens.security.episodes.timeline.failed-greet'
        );
      case 'greet_listen':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-greet-listen'
            : 'screens.security.episodes.timeline.failed-greet-listen'
        );
      case 'greet_reply':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-greet-reply'
            : 'screens.security.episodes.timeline.failed-greet-reply'
        );
      case 'alarm':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-alarm'
            : 'screens.security.episodes.timeline.failed-alarm'
        );
      case 'siren_arm':
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-siren-arm'
            : 'screens.security.episodes.timeline.failed-siren-arm'
        );
      default:
        return t(
          sent
            ? 'screens.security.episodes.timeline.action-siren-disarm'
            : 'screens.security.episodes.timeline.failed-siren-disarm'
        );
    }
  };
}

function TimelineLine({ entry, last }: TimelineLineProps) {
  const date = useDateFormatter();
  const describe = useEntryText();
  const strong = entry.type === 'decision' && entry.notified;

  return (
    <TimelineItem
      last={last}
      dotClassName={strong ? 'bg-error' : undefined}
      className="flex-row gap-3">
      <Text variant="caption" className="w-12 tabular-nums">
        {date.formatTime(new Date(entry.at * 1000))}
      </Text>
      <Text variant="body" className={cn('min-w-0 flex-1', strong && 'font-medium')}>
        {describe(entry)}
      </Text>
    </TimelineItem>
  );
}

export function EpisodeTimeline({ episodeId }: EpisodeTimelineProps) {
  const { t } = useTranslation();
  const load = useCallback(() => guardService.episode(episodeId), [episodeId]);
  const detail = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.guardEpisode,
    scope: String(episodeId),
    load,
  });
  const timeline = detail.data?.timeline ?? [];

  if (detail.status === 'failed')
    return <Text variant="caption">{t('screens.security.episodes.timeline-error')}</Text>;
  if (detail.data == null) return <ActivityIndicator size="small" className="self-start" />;

  return (
    <View className="pt-1">
      {timeline.map((entry, index) => (
        <TimelineLine
          key={`${entry.type}-${entry.at}-${index}`}
          entry={entry}
          last={index === timeline.length - 1}
        />
      ))}
    </View>
  );
}
