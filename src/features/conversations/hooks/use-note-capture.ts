import { useState } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { useNoteRecorder } from '@/features/conversations/hooks/use-note-recorder';
import type { HoldDecision, HoldRecordMode } from '@/features/conversations/model/hold-record';
import type { NoteRecorder, RecordedNote } from '@/features/conversations/model/voice-note';

export type NoteCapture = {
  recorder: NoteRecorder;
  mode: HoldRecordMode;
  dragDx: number;
  start: () => void;
  drag: (decision: HoldDecision, dx: number) => void;
  release: () => void;
  toggle: () => void;
  cancel: () => void;
  send: () => void;
};

export function useNoteCapture(onNote: (note: RecordedNote) => void): NoteCapture {
  const { t } = useTranslation();
  const recorder = useNoteRecorder();
  const [mode, setMode] = useState<HoldRecordMode>('idle');
  const [dragDx, setDragDx] = useState(0);

  const reset = () => {
    setMode('idle');
    setDragDx(0);
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

  const drag = (decision: HoldDecision, dx: number) => {
    if (mode !== 'holding') return;
    if (decision === 'cancel') cancel();
    else if (decision === 'lock') setMode('locked');
    else setDragDx(Math.min(0, dx));
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
    dragDx,
    start: () => begin('holding'),
    drag,
    release,
    toggle,
    cancel,
    send,
  };
}
