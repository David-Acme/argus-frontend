import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { CallSettingsDialog } from '@/features/voice/components/call-settings-dialog';
import { RoundControl } from '@/features/voice/components/round-control';
import { CALL_PANEL_CONTROL } from '@/features/voice/constants/call.constant';
import { useCallSpeaker } from '@/features/voice/hooks/use-call-speaker';

type CallPanelProps = {
  muted: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
  onViewCamera?: () => void;
};

export function CallPanel({ muted, onToggleMute, onHangUp, onViewCamera }: CallPanelProps) {
  const { t } = useTranslation();
  const [audioOpen, setAudioOpen] = useState(false);
  const speaker = useCallSpeaker(() => setAudioOpen(true));
  return (
    <View className="bg-surface rounded-sheet w-full flex-row justify-around px-3 py-4">
      <RoundControl
        icon="speaker"
        label={t('screens.voice.stage.speaker')}
        size={CALL_PANEL_CONTROL}
        tone={speaker.on ? 'on' : 'neutral'}
        toggled={speaker.on}
        disabled={!speaker.available}
        onPress={speaker.press}
      />
      <RoundControl
        icon="cam"
        label={t('screens.voice.stage.camera')}
        size={CALL_PANEL_CONTROL}
        disabled={!onViewCamera}
        onPress={() => onViewCamera?.()}
      />
      <RoundControl
        icon={muted ? 'micoff' : 'mic'}
        label={t('screens.voice.mute')}
        size={CALL_PANEL_CONTROL}
        tone={muted ? 'on' : 'neutral'}
        toggled={muted}
        onPress={onToggleMute}
      />
      <RoundControl
        icon="hang"
        label={t('screens.voice.hang-up')}
        size={CALL_PANEL_CONTROL}
        tone="decline"
        onPress={onHangUp}
      />
      <CallSettingsDialog
        open={audioOpen}
        onOpenChange={setAudioOpen}
        muted={muted}
        onToggleMute={onToggleMute}
      />
    </View>
  );
}
