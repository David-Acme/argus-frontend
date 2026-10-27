import { useSyncExternalStore } from 'react';
import { notePlayer } from '@/features/conversations/services/note-player';
import type { NotePlayerSnapshot } from '@/features/conversations/services/note-player/note-player';
import { nextSpeed } from '@/features/conversations/model/voice-note';
import type { NoteSpeed } from '@/features/conversations/model/voice-note';

export type NotePlayback = {
  active: boolean;
  playing: boolean;
  loading: boolean;
  failed: boolean;
  positionMs: number;
  speed: NoteSpeed;
  toggle: () => void;
  cycleSpeed: () => void;
};

const subscribe = (listener: () => void): (() => void) => notePlayer.subscribe(listener);

const getSnapshot = (): NotePlayerSnapshot => notePlayer.snapshot;

export function useNotePlayback(noteId: string): NotePlayback {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const active = noteId.length > 0 && snapshot.noteId === noteId;
  return {
    active,
    playing: active && snapshot.playing,
    loading: active && snapshot.loading,
    failed: active && snapshot.failed,
    positionMs: active ? snapshot.positionMs : 0,
    speed: snapshot.speed,
    toggle: () => void notePlayer.toggle(noteId),
    cycleSpeed: () => notePlayer.setSpeed(nextSpeed(snapshot.speed)),
  };
}
