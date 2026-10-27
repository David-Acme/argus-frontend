import type { NetHttpFile, VoiceNoteMime } from '@/core/types';

export type RecordedNote = {
  uri: string;
  mime: VoiceNoteMime;
  durationMs: number;
  peaks: number[];
};

export type NoteSpeed = 1 | 1.5 | 2;

export const NOTE_SPEEDS: readonly NoteSpeed[] = [1, 1.5, 2];

export const NOTE_PEAKS = 48;

export const VOICE_NOTE_FIELD = 'audio';

const EXTENSIONS: Readonly<Record<VoiceNoteMime, string>> = {
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/aac': 'aac',
};

export function noteFileOf(note: Pick<RecordedNote, 'uri' | 'mime'>): NetHttpFile {
  return {
    name: VOICE_NOTE_FIELD,
    uri: note.uri,
    filename: `note.${EXTENSIONS[note.mime]}`,
    contentType: note.mime,
  };
}

export function nextSpeed(speed: NoteSpeed): NoteSpeed {
  const index = NOTE_SPEEDS.indexOf(speed);
  return NOTE_SPEEDS[(index + 1) % NOTE_SPEEDS.length] ?? 1;
}

export function bucketPeaks(levels: readonly number[], buckets: number = NOTE_PEAKS): number[] {
  if (levels.length === 0) return Array.from({ length: buckets }, () => 0);
  const loudest = Math.max(...levels, Number.EPSILON);
  return Array.from({ length: buckets }, (_, bucket) => {
    const from = Math.floor((bucket * levels.length) / buckets);
    const to = Math.max(from + 1, Math.floor(((bucket + 1) * levels.length) / buckets));
    const peak = Math.max(...levels.slice(from, to));
    return Math.round((peak / loudest) * 100);
  });
}

export function levelOfDecibels(decibels: number | undefined, floor: number = -60): number {
  if (decibels === undefined || !Number.isFinite(decibels)) return 0;
  return Math.min(1, Math.max(0, (decibels - floor) / -floor));
}

export function noteClock(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function progressOf(positionMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, positionMs / durationMs));
}

export type NoteRecorderPhase = 'idle' | 'starting' | 'recording';

export type NoteRecorder = {
  supported: boolean;
  phase: NoteRecorderPhase;
  elapsedMs: number;
  levels: readonly number[];
  start: (onLimit: () => void) => Promise<boolean>;
  finish: () => Promise<RecordedNote | null>;
  cancel: () => void;
};

export const LIVE_LEVELS = 40;

export const RECORDER_TICK_MS = 100;

export function withLevel(
  levels: readonly number[],
  level: number,
  kept: number = LIVE_LEVELS
): number[] {
  return [...levels, level].slice(-kept);
}

export function noteMimeOf(type: string): VoiceNoteMime | null {
  const base = type.split(';')[0]?.trim().toLowerCase() ?? '';
  if (base === 'audio/ogg' || base === 'audio/webm' || base === 'audio/mp4' || base === 'audio/aac')
    return base;
  if (base === 'audio/x-m4a' || base === 'audio/m4a') return 'audio/mp4';
  return null;
}

export function keepsNote(durationMs: number, minMs: number): boolean {
  return Number.isFinite(durationMs) && durationMs >= minMs;
}

export type BarTone = 'played' | 'rest';

export const barToneOf = (index: number, played: number, active: boolean): BarTone =>
  active && index < played ? 'played' : 'rest';

export const TRANSCRIPT_LINES = 2;

export const TRANSCRIPT_LINE_CHARS = 26;

export const transcriptFolds = (transcript: string): boolean =>
  transcript.trim().length > TRANSCRIPT_LINES * TRANSCRIPT_LINE_CHARS;
