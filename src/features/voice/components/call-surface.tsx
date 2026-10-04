import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VoiceActionRecord, VoicePhase, VoiceTranscriptLine } from '@/core/types';
import Avatar from '@/features/voice/components/avatar';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { voiceErrorMessage } from '@/features/voice/model/voice-error';
import { CallActionChips } from '@/features/voice/components/call-action-chips';
import { CallControl } from '@/features/voice/components/call-control';
import { CallTranscript } from '@/features/voice/components/call-transcript';

type CallSurfaceProps = {
  phase: VoicePhase;
  muted: boolean;
  error: string | null;
  transcript: readonly VoiceTranscriptLine[];
  actions?: readonly VoiceActionRecord[];
  reason?: string | null;
  notice?: string | null;
  header?: ReactNode;
  camera?: ReactNode;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onHangUp: () => void;
  onRetry: () => void;
};

export function CallSurface({
  phase,
  muted,
  error,
  transcript,
  actions = [],
  reason = null,
  notice = null,
  header,
  camera,
  onToggleMute,
  onInterrupt,
  onHangUp,
  onRetry,
}: CallSurfaceProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isShort } = useWindowClass();
  const speaking = phase === 'speaking';
  const hint =
    phase === 'error'
      ? voiceErrorMessage(error, t)
      : muted
        ? t('screens.voice.muted-hint')
        : speaking
          ? t('screens.voice.speaking-hint')
          : notice;

  return (
    <View
      className="bg-background w-full max-w-lg flex-1 self-center px-6"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}>
      {header}
      <View className="items-center gap-1 pt-4">
        {reason ? (
          <Text variant="label" className="text-foreground-secondary text-center" numberOfLines={2}>
            {`${t('screens.voice.incoming-title')} · ${reason}`}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header">
          {t(`screens.voice.status-${phase}`)}
        </Text>
        <Text
          variant="caption"
          className="min-h-[18px] text-center"
          accessibilityLiveRegion="polite">
          {hint ?? ''}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        {camera ?? (
          <Avatar size={isShort ? 180 : 260} accessibilityLabel={t('screens.voice.call-title')} />
        )}
      </View>

      <View className="min-h-32 justify-end gap-4 pb-6">
        <CallTranscript lines={transcript} />
        <CallActionChips actions={actions} />
      </View>

      {phase === 'error' || phase === 'done' ? (
        <View className="flex-row justify-center gap-3">
          <Button variant="outline" size="lg" onPress={onHangUp}>
            <Text>{t('common.close')}</Text>
          </Button>
          <Button size="lg" onPress={onRetry}>
            <Text>{t('screens.voice.retry')}</Text>
          </Button>
        </View>
      ) : (
        <View className="flex-row items-start justify-center gap-6">
          <CallControl
            icon={muted ? 'mic-off' : 'mic'}
            label={muted ? t('screens.voice.unmute') : t('screens.voice.mute')}
            tone={muted ? 'active' : 'neutral'}
            onPress={onToggleMute}
          />
          {speaking ? (
            <CallControl icon="hand" label={t('screens.voice.interrupt')} onPress={onInterrupt} />
          ) : null}
          <CallControl
            icon="phone-off"
            label={t('screens.voice.hang-up')}
            tone="danger"
            onPress={onHangUp}
          />
        </View>
      )}
    </View>
  );
}
