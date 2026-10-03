import { useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { GuardDanger, GuardTimelineEntry } from '@/core/types';
import { guardService } from '@/core/services/guard.service';
import { Text } from '@/shared/components/ui/text';
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
      const times = entry.count > 1 ? ` ${t('screens.security.episodes.timeline.times', { count: String(entry.count) })}` : '';
      if (entry.notified)
        return t('screens.security.episodes.timeline.decision-alerted', { danger: danger(entry.danger) }) + times;
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
          return t('screens.security.episodes.timeline.decision-silent', { danger: danger(entry.danger) }) + times;
      }
    }
    const label = (() => {
      switch (entry.action) {
        case 'notify':
          return t('screens.security.episodes.timeline.action-notify');
        case 'announce':
          return t('screens.security.episodes.timeline.action-announce');
        case 'greet':
          return t('screens.security.episodes.timeline.action-greet');
        case 'greet_listen':
          return t('screens.security.episodes.timeline.action-greet-listen');
        case 'greet_reply':
          return t('screens.security.episodes.timeline.action-greet-reply');
        case 'alarm':
          return t('screens.security.episodes.timeline.action-alarm');
        case 'siren_arm':
          return t('screens.security.episodes.timeline.action-siren-arm');
        default:
          return t('screens.security.episodes.timeline.action-siren-disarm');
      }
    })();
    return SENT.has(entry.status) ? label : `${label} (${t('screens.security.episodes.timeline.not-sent')})`;
  };
}

function TimelineLine({ entry, last }: TimelineLineProps) {
  const date = useDateFormatter();
  const describe = useEntryText();
  const strong = entry.type === 'decision' && entry.notified;

  return (
    <View className="flex-row gap-3">
      <View className="w-3 items-center">
        <View className={cn('mt-1.5 size-2 rounded-full', strong ? 'bg-error' : 'bg-muted-foreground')} />
        {last ? null : <View className="bg-border-subtle mt-1 w-px flex-1" />}
      </View>
      <View className="min-w-0 flex-1 flex-row gap-3 pb-3">
        <Text variant="caption" className="w-12 tabular-nums">
          {date.formatTime(new Date(entry.at * 1000))}
        </Text>
        <Text variant="body" className={cn('min-w-0 flex-1', strong && 'font-medium')}>
          {describe(entry)}
        </Text>
      </View>
    </View>
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
        <TimelineLine key={`${entry.type}-${entry.at}-${index}`} entry={entry} last={index === timeline.length - 1} />
      ))}
    </View>
  );
}
