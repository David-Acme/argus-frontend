import { useState } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { useNoteRecorder } from '@/features/conversations/hooks/use-note-recorder';
import type { HoldRecordMode, HoldVerdict } from '@/features/conversations/model/hold-record';
import type { NoteRecorder, RecordedNote } from '@/features/conversations/model/voice-note';

export type NoteCapture = {
  recorder: NoteRecorder;
  mode: HoldRecordMode;
  drag: SharedValue<number>;
  start: () => void;
  decide: (verdict: HoldVerdict) => void;
  release: () => void;
  toggle: () => void;
  cancel: () => void;
  send: () => void;
};

export function useNoteCapture(onNote: (note: RecordedNote) => void): NoteCapture {
  const { t } = useTranslation();
  const recorder = useNoteRecorder();
  const [mode, setMode] = useState<HoldRecordMode>('idle');
  const drag = useSharedValue(0);

  const reset = () => {
    setMode('idle');
    drag.set(0);
  };

  const send = () => {
    reset();
    void recorder.finish().then((note) => {
      if (note) onNote(note);
      else toast.info(t('screens.conversations.note.too-short'));
    });
  };

  const cancel = () => {
    reset();
    recorder.cancel();
  };

  const begin = (next: HoldRecordMode) => {
    setMode(next);
    void recorder.start(send).then((started) => {
      if (!started) reset();
    });
  };

  const decide = (verdict: HoldVerdict) => {
    if (mode !== 'holding') return;
    if (verdict === 'cancel') cancel();
    else setMode('locked');
  };

  const release = () => {
    if (mode === 'holding') send();
  };

  const toggle = () => {
    if (mode === 'idle') begin('locked');
    else send();
  };

  return {
    recorder,
    mode,
    drag,
    start: () => begin('holding'),
    decide,
    release,
    toggle,
    cancel,
    send,
  };
}
