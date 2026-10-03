import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VoicePhase, VoiceTranscriptLine } from '@/core/types';
import Avatar from '@/features/voice/components/avatar';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { voiceErrorMessage } from '@/features/voice/model/voice-error';
import { CallControl } from '@/features/voice/components/call-control';
import { CallTranscript } from '@/features/voice/components/call-transcript';

type CallSurfaceProps = {
  phase: VoicePhase;
  muted: boolean;
  error: string | null;
  transcript: readonly VoiceTranscriptLine[];
  header?: ReactNode;
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
  header,
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
          : null;

  return (
    <View
      className="bg-background w-full max-w-lg flex-1 self-center px-6"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}>
      {header}
      <View className="items-center gap-1 pt-4">
        <Text variant="title" accessibilityRole="header">
          {t(`screens.voice.status-${phase}`)}
        </Text>
        <Text variant="caption" className="min-h-[18px]">
          {hint ?? ''}
        </Text>
      </View>

      <View className="flex-1 items-center justify-center">
        <Avatar size={isShort ? 180 : 260} accessibilityLabel={t('screens.voice.call-title')} />
      </View>

      <View className="min-h-32 justify-end pb-6">
        <CallTranscript lines={transcript} />
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
          <CallControl icon="phone-off" label={t('screens.voice.hang-up')} tone="danger" onPress={onHangUp} />
        </View>
      )}
    </View>
  );
}
