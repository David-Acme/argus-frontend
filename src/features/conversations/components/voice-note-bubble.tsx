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
  nextTranscriptView,
  noteClock,
  TRANSCRIPT_LINES,
  type TranscriptView,
} from '@/features/conversations/model/voice-note';

export type VoiceNoteBubbleProps = {
  note: ConversationVoiceNote;
  transcript: string;
  view: TranscriptView;
  onView: (view: TranscriptView) => void;
};

const NOTE_BODY = { width: size.wellSmall + space[2] + NOTE_WAVE_WIDTH } as const;

type TranscriptProps = Omit<VoiceNoteBubbleProps, 'note'>;

const TOGGLE_LABELS = {
  hidden: 'screens.conversations.note.show-transcript',
  folded: 'screens.conversations.note.more',
  whole: 'screens.conversations.note.hide-transcript',
} as const;

function Transcript({ transcript, view, onView }: TranscriptProps) {
  const { t } = useTranslation();
  if (transcript.trim().length === 0) return null;
  const toggle = t(TOGGLE_LABELS[view]);
  return (
    <View className="gap-1">
      {view === 'hidden' ? null : (
        <Text
          variant="meta"
          tone="2"
          numberOfLines={view === 'folded' ? TRANSCRIPT_LINES : undefined}>
          {transcript}
        </Text>
      )}
      <PressableSurface
        a11y={{ label: toggle, role: 'button' }}
        onPress={() => onView(nextTranscriptView(view, transcript))}
        className="self-start">
        <Text variant="caption" tone="accent">
          {toggle}
        </Text>
      </PressableSurface>
    </View>
  );
}

export function VoiceNoteBubble({ note, transcript, view, onView }: VoiceNoteBubbleProps) {
  const { t } = useTranslation();
  const playback = useNotePlayback(note.id);
  const stored = note.id.length > 0;
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
          <NoteWave
            peaks={note.peaks}
            positionMs={playback.positionMs}
            durationMs={note.durationMs}
            playing={playback.playing}
            speed={playback.speed}
          />
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
      <Transcript transcript={transcript} view={view} onView={onView} />
    </View>
  );
}
