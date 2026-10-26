import { useRouter } from 'expo-router';
import { View } from 'react-native';
import type { GuardEpisode, GuardFeedbackLabel } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice, type ChoiceOption } from '@/shared/ui/choice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Sheet } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import { TamperEvidenceView } from '@/features/cameras';
import { EpisodeTimeline } from '@/features/security/components/episode-timeline';
import { claimTamper } from '@/features/security/hooks/use-maintenance';
import {
  askReview,
  durationSeconds,
  episodeTitle,
  formatDuration,
  isRetained,
  outcomeText,
  reasonsText,
} from '@/features/security/model/episode';

export type EpisodeActions = {
  review: (episode: GuardEpisode, label: GuardFeedbackLabel) => Promise<boolean>;
  retain: (episode: GuardEpisode, keep: boolean) => Promise<boolean>;
};

type EpisodeSheetProps = {
  episode: GuardEpisode | null;
  where: string;
  actions: EpisodeActions;
  onClose: () => void;
};

type EpisodeBodyProps = Omit<EpisodeSheetProps, 'onClose' | 'episode'> & { episode: GuardEpisode };

const REVIEW_LABELS = {
  useful: 'screens.security.episodes.useful',
  false_alarm: 'screens.security.episodes.false-alarm',
  not_now: 'screens.security.episodes.not-now',
} as const;

function EpisodeBody({ episode, where, actions }: EpisodeBodyProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { guard, clips } = useCapabilities();
  const at = new Date(episode.lastSeen * 1000);
  const lasted = durationSeconds(episode);
  const options: ChoiceOption<GuardFeedbackLabel | ''>[] = (
    Object.keys(REVIEW_LABELS) as GuardFeedbackLabel[]
  ).map((label) => ({ value: label, label: t(REVIEW_LABELS[label]) }));
  return (
    <View className="gap-3">
      <Row
        title={outcomeText(episode, t)}
        meta={[
          where,
          `${date.formatDayMonth(at)} ${date.formatTime(at)}`,
          lasted > 0
            ? t('screens.security.episodes.lasted', { duration: formatDuration(lasted) })
            : null,
          reasonsText(episode, t),
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <TamperEvidenceView
        target={{ cameraId: episode.cameraId, onsetAt: episode.firstSeen }}
        enabled={clips.view}
        looks={episode.kind === 'person'}
        quiet={episode.kind === 'person'}
      />
      {guard.review && askReview(episode) ? (
        <Section title={t('screens.security.episode-sheet.review-title')} variant="plain">
          <Choice
            label={t('screens.security.episode-sheet.review-title')}
            options={options}
            value={episode.reviewLabel}
            onChange={(label) => {
              if (label !== '') void actions.review(episode, label);
            }}
          />
        </Section>
      ) : null}
      {episode.kind === 'person' ? (
        <Section title={t('screens.security.episode-sheet.outcome')} variant="plain">
          <EpisodeTimeline episodeId={episode.id} />
        </Section>
      ) : null}
      {guard.review && episode.kind === 'person' ? (
        <Row
          title={t('screens.security.episode-sheet.retain')}
          meta={t('screens.security.episode-sheet.retain-detail')}
          trailing={
            <Switch
              label={t('screens.security.episode-sheet.retain')}
              value={isRetained(episode)}
              onValueChange={(keep) => void actions.retain(episode, keep)}
            />
          }
        />
      ) : null}
    </View>
  );
}

export function EpisodeSheet({ episode, where, actions, onClose }: EpisodeSheetProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { guard } = useCapabilities();
  if (!episode) return null;
  const claimable = episode.kind === 'camera' && episode.state === 'active' && guard.maintenance;
  const primary = claimable
    ? {
        label: t('screens.security.episode-sheet.claim'),
        onPress: async () => {
          if (await claimTamper(episode.id)) onClose();
        },
      }
    : {
        label: t('screens.security.hero.see-camera'),
        onPress: () => {
          onClose();
          router.push(`/cameras/${episode.cameraId}`);
        },
      };
  return (
    <Sheet
      open
      variant="detail"
      title={episodeTitle(t, episode)}
      onClose={onClose}
      actions={{ primary }}>
      <EpisodeBody episode={episode} where={where} actions={actions} />
    </Sheet>
  );
}
