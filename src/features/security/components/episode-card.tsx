import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { GuardCameraContext, GuardEpisode, GuardFeedbackLabel, IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { DangerBadge } from '@/features/security/components/danger-badge';
import { EpisodeTimeline } from '@/features/security/components/episode-timeline';
import { CAMERA_ROLE_ICONS, REASON_KEYS } from '@/features/security/constants';
import {
  calmingReasons,
  durationSeconds,
  episodeOutcome,
  formatDuration,
  raisingReasons,
} from '@/features/security/model/episode';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type EpisodeCardProps = {
  episode: GuardEpisode;
  cameraName: string;
  context: GuardCameraContext | null;
  onReview: (episode: GuardEpisode, label: GuardFeedbackLabel) => void;
};

type ReviewOption = { value: GuardFeedbackLabel; key: 'useful' | 'false-alarm' | 'not-now' };

const REVIEW_OPTIONS: readonly ReviewOption[] = [
  { value: 'useful', key: 'useful' },
  { value: 'false_alarm', key: 'false-alarm' },
  { value: 'not_now', key: 'not-now' },
];

const chipHover = Platform.select({ web: 'hover:bg-surface-secondary', default: '' });
const linkHover = Platform.select({ web: 'hover:opacity-80', default: '' });

export function EpisodeCard({ episode, cameraName, context, onReview }: EpisodeCardProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [expanded, setExpanded] = useState(false);
  const outcome = episodeOutcome(episode);
  const camera = episode.kind === 'camera';
  const active = episode.state === 'active';
  const icon: IconName = camera ? 'triangle-alert' : context ? CAMERA_ROLE_ICONS[context.role] : 'user';
  const at = new Date(episode.lastSeen * 1000);
  const lasted = durationSeconds(episode);
  const reasons = episode.notified ? raisingReasons(episode) : calmingReasons(episode);
  const shown = reasons.length > 0 ? reasons : raisingReasons(episode);

  const title = camera
    ? t(
        `screens.security.episodes.tamper.${
          episode.status === 'covered' || episode.status === 'moved' || episode.status === 'blurred'
            ? episode.status
            : 'other'
        }`
      )
    : episode.subject === 'several'
      ? t('screens.security.episodes.subject.several', { count: String(Math.max(2, episode.people)) })
      : t(`screens.security.episodes.subject.${episode.subject === '' ? 'stranger' : episode.subject}`);

  const stateLabel = active
    ? t('screens.security.episodes.state.active')
    : episode.resolution === ''
      ? t('screens.security.episodes.state.resolved')
      : t(`screens.security.episodes.state.${episode.resolution}`);

  const outcomeLabel =
    outcome === 'alerted' && episode.notifyCount > 1
      ? `${t('screens.security.episodes.outcome.alerted')} · ${t('screens.security.episodes.alerts-count', { count: String(episode.notifyCount) })}`
      : t(`screens.security.episodes.outcome.${outcome}`);

  const meta = [
    cameraName,
    `${date.formatDayMonth(at)} ${date.formatTime(at)}`,
    lasted > 0 ? t('screens.security.episodes.lasted', { duration: formatDuration(lasted) }) : null,
  ].filter((part): part is string => part !== null);

  return (
    <View className="gap-2.5 rounded-2xl px-3 py-3">
      <View className="flex-row items-start gap-3">
        <View
          className={cn(
            'size-10 items-center justify-center rounded-2xl',
            outcome === 'alerted' || camera ? 'bg-error/10' : 'bg-surface-secondary'
          )}>
          <Icon
            name={icon}
            className={cn(
              'size-5',
              outcome === 'alerted' || camera ? 'text-error-strong' : 'text-foreground-secondary'
            )}
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text variant="body" numberOfLines={1} className="flex-1 font-medium">
              {title}
            </Text>
            <DangerBadge danger={episode.danger} />
          </View>
          <Text variant="caption" numberOfLines={2}>
            {meta.join(' · ')}
          </Text>
        </View>
      </View>
      <View className="flex-row flex-wrap items-center gap-2 pl-[52px]">
        <View
          className={cn(
            'flex-row items-center gap-1.5 rounded-full px-2.5 py-1',
            active ? 'bg-accent/15' : 'bg-surface-secondary'
          )}>
          <View className={cn('size-1.5 rounded-full', active ? 'bg-accent' : 'bg-muted-foreground')} />
          <Text variant="micro" className={cn('font-semibold', active ? 'text-accent-strong' : 'text-foreground-secondary')}>
            {stateLabel}
          </Text>
        </View>
        <Text variant="caption" className="text-foreground">
          {outcomeLabel}
        </Text>
        {episode.spoke ? (
          <View className="flex-row items-center gap-1">
            <Icon name="volume-2" className="text-muted-foreground size-3.5" />
            <Text variant="caption">{t('screens.security.episodes.spoke')}</Text>
          </View>
        ) : null}
        {episode.sounded ? (
          <View className="flex-row items-center gap-1">
            <Icon name="siren" className="text-muted-foreground size-3.5" />
            <Text variant="caption">{t('screens.security.episodes.sounded')}</Text>
          </View>
        ) : null}
      </View>
      {shown.length > 0 ? (
        <Text variant="caption" className="pl-[52px]">
          {t('screens.security.episodes.why', {
            reasons: shown.map((reason) => t(`screens.security.episodes.reason.${REASON_KEYS[reason]}`)).join(', '),
          })}
        </Text>
      ) : null}
      {episode.kind === 'person' && episode.notified ? (
        <View className="gap-1.5 pl-[52px]">
          <Text variant="micro">{t('screens.security.episodes.review-prompt')}</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {REVIEW_OPTIONS.map((option) => {
              const chosen = episode.reviewLabel === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  onPress={() => onReview(episode, option.value)}
                  className={cn(
                    'min-h-9 justify-center rounded-full border px-3.5 active:opacity-70',
                    chosen ? 'bg-interactive border-interactive' : cn('border-border bg-card', chipHover)
                  )}>
                  <Text
                    variant="label"
                    className={chosen ? 'text-foreground-on-interactive' : 'text-foreground'}>
                    {t(`screens.security.episodes.${option.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {episode.kind === 'person' ? (
        <View className="gap-2 pl-[52px]">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded((open) => !open)}
            className={cn('min-h-9 flex-row items-center gap-1 self-start active:opacity-70', linkHover)}>
            <Text variant="label" className="text-foreground-secondary">
              {expanded ? t('screens.security.episodes.hide-timeline') : t('screens.security.episodes.show-timeline')}
            </Text>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} className="text-muted-foreground size-4" />
          </Pressable>
          {expanded ? <EpisodeTimeline episodeId={episode.id} /> : null}
        </View>
      ) : null}
    </View>
  );
}
