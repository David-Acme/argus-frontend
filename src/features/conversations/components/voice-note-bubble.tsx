import { View } from 'react-native';
import type { ConversationVoiceNote } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size, space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import { NOTE_WAVE_WIDTH, NoteWave } from '@/features/conversations/components/note-wave';
import { useNotePlayback } from '@/features/conversations/hooks/use-note-playback';
import {
  noteClock,
  progressOf,
  TRANSCRIPT_LINES,
  transcriptFolds,
} from '@/features/conversations/model/voice-note';

export type VoiceNoteBubbleProps = {
  note: ConversationVoiceNote;
  transcript: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
};

const NOTE_BODY = { width: size.wellSmall + space[2] + NOTE_WAVE_WIDTH } as const;

type TranscriptProps = {
  transcript: string;
  expanded: boolean;
  onExpand: (expanded: boolean) => void;
};

function Transcript({ transcript, expanded, onExpand }: TranscriptProps) {
  const { t } = useTranslation();
  if (transcript.trim().length === 0) return null;
  const toggle = expanded ? t('screens.conversations.note.less') : t('screens.conversations.note.more');
  return (
    <View className="gap-1">
      <Text variant="meta" tone="2" numberOfLines={expanded ? undefined : TRANSCRIPT_LINES}>
        {transcript}
      </Text>
      {transcriptFolds(transcript) ? (
        <PressableSurface
          a11y={{ label: toggle, role: 'button' }}
          onPress={() => onExpand(!expanded)}
          className="self-start">
          <Text variant="caption" tone="accent">
            {toggle}
          </Text>
        </PressableSurface>
      ) : null}
    </View>
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
    <View className="gap-1" style={NOTE_BODY}>
      <View className="flex-row items-center gap-2">
        <Button
          iconOnly
          compact
          icon={playback.playing ? 'pause' : 'play'}
          label={`${playback.playing ? t('screens.conversations.note.pause') : t('screens.conversations.note.play')}. ${t('screens.conversations.note.position', { clock })}`}
          onPress={playback.toggle}
          busy={playback.loading}
          disabled={!stored}
        />
        <View className="gap-1">
          <NoteWave peaks={note.peaks} progress={progress} active={playback.active} />
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
