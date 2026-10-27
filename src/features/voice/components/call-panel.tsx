import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { CallSettingsDialog } from '@/features/voice/components/call-settings-dialog';
import { RoundControl } from '@/features/voice/components/round-control';
import { useCallScale } from '@/features/voice/hooks/use-call-scale';
import { useCallSpeaker } from '@/features/voice/hooks/use-call-speaker';

type CallPanelProps = {
  muted: boolean;
  onToggleMute: () => void;
  onHangUp: () => void;
  onViewCamera?: () => void;
};

export function CallPanel({ muted, onToggleMute, onHangUp, onViewCamera }: CallPanelProps) {
  const { t } = useTranslation();
  const { panelControl } = useCallScale();
  const [audioOpen, setAudioOpen] = useState(false);
  const speaker = useCallSpeaker(() => setAudioOpen(true));
  return (
    <View className="border-line rounded-sheet w-full flex-row justify-around border px-2 py-2">
      <RoundControl
        icon="speaker"
        label={t('screens.voice.stage.speaker')}
        size={panelControl}
        tone={speaker.on ? 'on' : 'neutral'}
        toggled={speaker.on}
        disabled={!speaker.available}
        onPress={speaker.press}
      />
      <RoundControl
        icon="cam"
        label={t('screens.voice.stage.camera')}
        size={panelControl}
        disabled={!onViewCamera}
        onPress={() => onViewCamera?.()}
      />
      <RoundControl
        icon={muted ? 'micoff' : 'mic'}
        label={t('screens.voice.mute')}
        size={panelControl}
        tone={muted ? 'on' : 'neutral'}
        toggled={muted}
        onPress={onToggleMute}
      />
      <RoundControl
        icon="hang"
        label={t('screens.voice.hang-up')}
        size={panelControl}
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
