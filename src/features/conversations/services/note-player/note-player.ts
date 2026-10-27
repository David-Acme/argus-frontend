import type { VoiceNoteContent } from '@/core/types';
import type { NoteSpeed } from '@/features/conversations/model/voice-note';

export type NoteStatus = {
  positionMs: number;
  durationMs: number;
  playing: boolean;
  ended: boolean;
};

export type NoteSound = {
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  setRate: (rate: number) => void;
  release: () => void;
};

export type NoteEngine = {
  open: (content: VoiceNoteContent, onStatus: (status: NoteStatus) => void) => NoteSound;
};

export type NotePlayerDeps = {
  engine: NoteEngine;
  fetchContent: (noteId: string) => Promise<VoiceNoteContent | null>;
};

export type NotePlayerSnapshot = {
  noteId: string | null;
  loading: boolean;
  failed: boolean;
  playing: boolean;
  positionMs: number;
  durationMs: number;
  speed: NoteSpeed;
};

type Listener = () => void;

export const NOTE_CONTENTS_KEPT = 6;

const IDLE: NotePlayerSnapshot = {
  noteId: null,
  loading: false,
  failed: false,
  playing: false,
  positionMs: 0,
  durationMs: 0,
  speed: 1,
};

export class NotePlayer {
  private snapshotValue: NotePlayerSnapshot = IDLE;
  private sound: NoteSound | null = null;
  private contents = new Map<string, VoiceNoteContent>();
  private listeners = new Set<Listener>();

  constructor(private readonly deps: NotePlayerDeps) {}

  get snapshot(): NotePlayerSnapshot {
    return this.snapshotValue;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async toggle(noteId: string): Promise<void> {
    const current = this.snapshotValue;
    if (current.noteId === noteId && this.sound) {
      if (current.playing) this.sound.pause();
      else this.sound.play();
      return;
    }
    this.stop();
    this.update({ ...IDLE, noteId, loading: true, speed: current.speed });
    const content = await this.contentOf(noteId);
    if (this.snapshotValue.noteId !== noteId) return;
    if (!content) {
      this.update({ loading: false, failed: true });
      return;
    }
    this.sound = this.deps.engine.open(content, (status) => this.onStatus(noteId, status));
    this.sound.setRate(this.snapshotValue.speed);
    this.update({ loading: false, durationMs: content.durationMs });
    this.sound.play();
  }

  setSpeed(speed: NoteSpeed): void {
    this.sound?.setRate(speed);
    this.update({ speed });
  }

  stop(): void {
    this.sound?.release();
    this.sound = null;
    if (this.snapshotValue.noteId !== null)
      this.update({ ...IDLE, speed: this.snapshotValue.speed });
  }

  private onStatus(noteId: string, status: NoteStatus): void {
    if (this.snapshotValue.noteId !== noteId) return;
    if (status.ended) {
      this.sound?.seek(0);
      this.sound?.pause();
      this.update({ playing: false, positionMs: 0 });
      return;
    }
    this.update({
      playing: status.playing,
      positionMs: status.positionMs,
      durationMs: status.durationMs > 0 ? status.durationMs : this.snapshotValue.durationMs,
    });
  }

  private async contentOf(noteId: string): Promise<VoiceNoteContent | null> {
    const kept = this.contents.get(noteId);
    if (kept) return kept;
    const content = await this.deps.fetchContent(noteId).catch(() => null);
    if (!content) return null;
    this.contents.set(noteId, content);
    for (const key of this.contents.keys()) {
      if (this.contents.size <= NOTE_CONTENTS_KEPT) break;
      this.contents.delete(key);
    }
    return content;
  }

  private update(patch: Partial<NotePlayerSnapshot>): void {
    this.snapshotValue = { ...this.snapshotValue, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
