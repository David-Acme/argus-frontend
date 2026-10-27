import { View } from 'react-native';
import type { ConversationVoiceNote } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { NoteWave } from '@/features/conversations/components/note-wave';
import { useNotePlayback } from '@/features/conversations/hooks/use-note-playback';
import { noteClock, progressOf } from '@/features/conversations/model/voice-note';

export type VoiceNoteBubbleProps = {
  note: ConversationVoiceNote;
  transcript: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
};

type TranscriptProps = {
  transcript: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
};

function Transcript({ transcript, expanded, onExpand }: TranscriptProps) {
  const { t } = useTranslation();
  if (transcript.trim().length === 0) return null;
  if (expanded)
    return (
      <PressableSurface
        a11y={{ label: t('screens.conversations.note.hide-transcript'), role: 'button' }}
        onPress={() => onExpand(false)}>
        <Text variant="meta" tone="2">
          {transcript}
        </Text>
      </PressableSurface>
    );
  return (
    <PressableSurface
      a11y={{ label: t('screens.conversations.note.show-transcript'), role: 'button' }}
      onPress={() => onExpand(true)}>
      <Text variant="caption" tone="2">
        {t('screens.conversations.note.show-transcript')}
      </Text>
    </PressableSurface>
  );
}

export function VoiceNoteBubble({ note, transcript, expanded, onExpand }: VoiceNoteBubbleProps) {
  const { t } = useTranslation();
  const playback = useNotePlayback(note.id);
  const stored = note.id.length > 0;
  const progress = progressOf(playback.positionMs, note.durationMs);
  const clock = noteClock(
    playback.active && playback.positionMs > 0 ? playback.positionMs : note.durationMs
  );

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Button
          iconOnly
          icon={playback.playing ? 'pause' : 'play'}
          label={`${playback.playing ? t('screens.conversations.note.pause') : t('screens.conversations.note.play')}. ${t('screens.conversations.note.position', { clock })}`}
          onPress={playback.toggle}
          busy={playback.loading}
          disabled={!stored}
        />
        <View className="gap-1">
          <NoteWave peaks={note.peaks} progress={progress} />
          <View className="flex-row items-center justify-between">
            <Text variant="caption" tone={playback.failed ? 'alert' : '2'}>
              {playback.failed ? t('screens.conversations.note.failed') : clock}
            </Text>
            {playback.active ? (
              <PressableSurface
                a11y={{
                  label: t('screens.conversations.note.speed', { speed: String(playback.speed) }),
                  role: 'button',
                }}
                onPress={playback.cycleSpeed}
                className="bg-fill rounded-full px-2">
                <Text variant="caption">{`${playback.speed}×`}</Text>
              </PressableSurface>
            ) : null}
          </View>
        </View>
      </View>
      <Transcript transcript={transcript} expanded={expanded} onExpand={onExpand} />
    </View>
  );
}
