import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { WatchConversation } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useVoiceCallActive } from '@/features/voice';
import { useContinueHere } from '@/features/watch/hooks/use-continue-here';
import { screenIn } from '@/shared/libs/animations';
import { WatchTranscript } from '@/features/watch/components/watch-transcript';
import { useWatch } from '@/features/watch/hooks/use-watch';
import { useWatchActions } from '@/features/watch/hooks/use-watch-actions';
import {
  canContinueHere,
  canEndConversation,
  formatCountdown,
  resumableSecondsLeft,
  WATCH_AUDIENCE_NOTE,
  WATCH_END_LABEL,
  WATCH_HANDOFF_LABEL,
  WATCH_INDICATORS,
} from '@/features/watch/model/watch-conversation';

type WatchStatusProps = {
  conversation: WatchConversation;
  live: boolean;
  now: number;
};

function WatchStatus({ conversation, live, now }: WatchStatusProps) {
  const { t } = useTranslation();
  const indicator = WATCH_INDICATORS[conversation.state];
  const handoff = WATCH_HANDOFF_LABEL[conversation.handoff];
  const audience = WATCH_AUDIENCE_NOTE[conversation.audience];
  const left = resumableSecondsLeft(conversation, now);
  const ended = conversation.endReason ? WATCH_END_LABEL[conversation.endReason] : null;

  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        <StatusBadge icon={indicator.icon} label={t(indicator.label)} dotClassName={indicator.dot} />
        {handoff ? <StatusBadge icon="smartphone" label={t(handoff)} /> : null}
      </View>
      {live && conversation.state === 'waking' ? (
        <Text variant="caption">{t('screens.watch.earcon-note')}</Text>
      ) : null}
      {left !== null ? (
        <Text variant="caption">{t('screens.watch.resumable-left', { time: formatCountdown(left) })}</Text>
      ) : null}
      {!live && ended ? <Text variant="caption">{t(ended)}</Text> : null}
      {live && audience ? (
        <Text variant="caption" className="bg-surface-secondary dark:bg-card-secondary rounded-2xl px-3 py-2.5">
          {t(audience)}
        </Text>
      ) : null}
    </View>
  );
}

export default function WatchScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { live, latest, now } = useWatch();
  const { end, pending } = useWatchActions();
  const callActive = useVoiceCallActive();
  const { continueHere, supported } = useContinueHere();
  const offerContinue = supported && canContinueHere(live, now, callActive);
  const conversation = live ?? latest;
  const title = conversation?.cameraName
    ? t('screens.watch.title-camera', { camera: conversation.cameraName })
    : t('screens.watch.title');

  return (
    <AppScreen
      scrollable={false}
      header={
        <ScreenHeader
          title={title}
          subtitle={live ? undefined : conversation ? t('screens.watch.last-conversation') : undefined}
          onBack={() => router.back()}
        />
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow pb-8">
        <Animated.View entering={screenIn} className="w-full max-w-2xl grow gap-5 self-center">
          {conversation ? (
            <>
              <WatchStatus conversation={conversation} live={live !== null} now={now} />
              <Panel title={t('screens.watch.transcript-title')}>
                <WatchTranscript turns={conversation.turns} />
              </Panel>
              {offerContinue && live ? (
                <View className="gap-1.5">
                  <Button
                    onPress={() => continueHere({ conversationId: live.conversationId, cameraName: live.cameraName })}>
                    <Text>{t('screens.watch.continue-here')}</Text>
                  </Button>
                  <Text variant="caption" className="text-center">
                    {t('screens.watch.continue-hint')}
                  </Text>
                </View>
              ) : null}
              {canEndConversation(live, now) && live ? (
                <Button variant="outline" disabled={pending} onPress={() => void end(live)}>
                  <Text>{t('screens.watch.end-action')}</Text>
                </Button>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon="ear"
              title={t('screens.watch.no-conversation')}
              hint={t('screens.watch.no-conversation-hint')}
              fill
            />
          )}
        </Animated.View>
      </ScrollView>
    </AppScreen>
  );
}
