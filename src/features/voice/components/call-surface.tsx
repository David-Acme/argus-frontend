import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { VoiceActionRecord, VoicePhase, VoiceTranscriptLine } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';
import { CallCaptions } from '@/features/voice/components/call-captions';
import { EndedSummary, StageTop, WaitingCard } from '@/features/voice/components/call-notes';
import { CallPanel } from '@/features/voice/components/call-panel';
import { CallStage } from '@/features/voice/components/call-stage';
import { useCallClock } from '@/features/voice/hooks/use-call-clock';
import {
  stageHintOf,
  stageLineOf,
  stageMomentOf,
  stagePresenceOf,
} from '@/features/voice/model/call-stage';
import type { CallKind } from '@/features/voice/model/incoming-surface';
import { voiceLevel } from '@/features/voice/model/voice-level';

type CallSurfaceProps = {
  phase: VoicePhase;
  muted: boolean;
  error: string | null;
  transcript: readonly VoiceTranscriptLine[];
  actions?: readonly VoiceActionRecord[];
  kind?: CallKind;
  connectedAt?: number | null;
  reason?: string | null;
  notice?: string | null;
  waitingReason?: string | null;
  header?: ReactNode;
  situation?: ReactNode;
  results?: ReactNode;
  footnote?: ReactNode;
  endedDurationMs?: number | null;
  onAnswerWaiting?: () => void;
  onDismissWaiting?: () => void;
  onViewCamera?: () => void;
  onMinimise?: () => void;
  onSwitchToChat?: () => void;
  onClose?: () => void;
  onToggleMute: () => void;
  onHangUp: () => void;
  onRetry: () => void;
};

export function CallSurface({
  phase,
  muted,
  error,
  transcript,
  actions = [],
  kind = 'reminder',
  connectedAt = null,
  reason = null,
  notice = null,
  waitingReason = null,
  header,
  situation,
  results,
  footnote,
  endedDurationMs = null,
  onAnswerWaiting,
  onDismissWaiting,
  onViewCamera,
  onMinimise,
  onSwitchToChat,
  onClose,
  onToggleMute,
  onHangUp,
  onRetry,
}: CallSurfaceProps) {
  const { t } = useTranslation();
  const elapsedMs = useCallClock(endedDurationMs === null ? connectedAt : null);
  const moment = stageMomentOf({ phase, endedDurationMs });
  const line = stageLineOf({
    t,
    moment,
    phase,
    elapsedMs,
    connected: connectedAt !== null,
    reason,
    endedDurationMs,
  });
  const hint = moment === 'ended' ? null : stageHintOf({ t, phase, error, muted, notice });
  return (
    <CallStage
      kind={moment === 'ended' ? 'reminder' : kind}
      line={line}
      presence={stagePresenceOf({ moment, phase, kind })}
      ended={moment === 'ended'}
      level={voiceLevel}
      top={
        moment === 'live' ? (
          <StageTop header={header} onMinimise={onMinimise} onSwitchToChat={onSwitchToChat} />
        ) : (
          header
        )
      }>
      {waitingReason && moment === 'live' ? (
        <WaitingCard
          reason={waitingReason}
          onAnswer={onAnswerWaiting}
          onDismiss={onDismissWaiting}
        />
      ) : null}
      {moment === 'ended' ? (
        <EndedSummary actions={actions} />
      ) : (
        <View className="mt-6 min-h-0 w-full shrink gap-3 overflow-hidden">
          <CallCaptions lines={transcript} />
          {hint ? (
            <Text variant="meta" tone={phase === 'error' ? 'alert' : '2'} align="center">
              {hint}
            </Text>
          ) : null}
          {situation}
          {results}
        </View>
      )}
      <View className="flex-1" />
      {moment === 'live' ? (
        <CallPanel
          muted={muted}
          onToggleMute={onToggleMute}
          onHangUp={onHangUp}
          onViewCamera={onViewCamera}
        />
      ) : null}
      {moment === 'live' && footnote ? <View className="mt-3">{footnote}</View> : null}
      {moment === 'failed' ? (
        <View className="w-full flex-row gap-3">
          <View className="flex-1">
            <Button label={t('common.close')} onPress={onHangUp} block />
          </View>
          <View className="flex-1">
            <Button label={t('screens.voice.retry')} onPress={onRetry} variant="primary" block />
          </View>
        </View>
      ) : null}
      {moment === 'ended' && onClose ? (
        <View className="w-full">
          <Button label={t('screens.voice.stage.back')} onPress={onClose} block />
        </View>
      ) : null}
    </CallStage>
  );
}
