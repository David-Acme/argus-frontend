import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { Text } from '@/shared/ui/text';
import { MicHold } from '@/features/conversations/components/mic-hold';
import { RecordingBar } from '@/features/conversations/components/recording-bar';
import { useNoteCapture } from '@/features/conversations/hooks/use-note-capture';
import type { NoteCapture } from '@/features/conversations/hooks/use-note-capture';
import {
  charactersOf,
  composerButtonOf,
  sendableMessage,
  showsCounter,
} from '@/features/conversations/model/composer';
import type { RecordedNote } from '@/features/conversations/model/voice-note';

export type ThreadComposerProps = {
  placeholder: string;
  sendLabel: string;
  maxChars: number;
  readDraft: () => string;
  onDraft: (draft: string) => void;
  onSend: (text: string) => boolean | Promise<boolean>;
  onNote: ((note: RecordedNote) => void) | null;
  busy: boolean;
};

type ActionProps = {
  capture: NoteCapture;
  mic: boolean;
  sendLabel: string;
  canSend: boolean;
  onSend: () => void;
};

function ComposerAction({ capture, mic, sendLabel, canSend, onSend }: ActionProps) {
  const { t } = useTranslation();
  const recording = capture.mode !== 'idle';
  return (
    <View>
      {mic && capture.mode !== 'locked' ? (
        <MicHold
          holding={capture.mode === 'holding'}
          onStart={capture.start}
          drag={capture.drag}
          onDecide={capture.decide}
          onRelease={capture.release}
          onActivate={capture.toggle}
        />
      ) : (
        <Button
          iconOnly
          ink
          icon="send"
          label={recording ? t('screens.conversations.note.send') : sendLabel}
          onPress={recording ? capture.send : onSend}
          disabled={!recording && !canSend}
        />
      )}
    </View>
  );
}

export function ThreadComposer({
  placeholder,
  sendLabel,
  maxChars,
  readDraft,
  onDraft,
  onSend,
  onNote,
  busy,
}: ThreadComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(readDraft);
  const capture = useNoteCapture((note) => onNote?.(note));
  const body = sendableMessage(draft, maxChars);
  const characters = charactersOf(draft);
  const recording = capture.mode !== 'idle';
  const action = composerButtonOf({
    typed: draft.trim().length > 0,
    listening: false,
    canRecord: onNote !== null && capture.recorder.supported,
  });

  const change = (next: string) => {
    setDraft(next);
    onDraft(next);
  };

  const send = async () => {
    if (body === null || busy) return;
    change('');
    if (!(await onSend(body))) change(body);
  };

  return (
    <View className="gap-1">
      <View className="flex-row items-end gap-2">
        {recording ? (
          <RecordingBar
            mode={capture.mode === 'locked' ? 'locked' : 'holding'}
            elapsedMs={capture.recorder.elapsedMs}
            live={capture.recorder.live}
            drag={capture.drag}
            onCancel={capture.cancel}
          />
        ) : (
          <View className="min-w-0 flex-1">
            <Field
              kind="message"
              placeholder={placeholder}
              value={draft}
              onChangeText={change}
              submit={{ key: 'done', onSubmit: () => void send() }}
            />
          </View>
        )}
        <ComposerAction
          capture={capture}
          mic={action === 'mic'}
          sendLabel={sendLabel}
          canSend={body !== null && !busy}
          onSend={() => void send()}
        />
      </View>
      {showsCounter(characters, maxChars) ? (
        <View className="items-end">
          <Text variant="caption" tone={characters > maxChars ? 'alert' : '3'}>
            {t('screens.conversations.composer.count', {
              count: String(characters),
              max: String(maxChars),
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
