import { useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { VOICE_NOTE_MAX_MS, VOICE_NOTE_MIN_MS } from '@/core/services/conversation';
import {
  bucketPeaks,
  keepsNote,
  noteMimeOf,
  LIVE_LEVELS,
  RECORDER_TICK_MS,
} from '@/features/conversations/model/voice-note';
import { LIVE_EMPTY, pushLevel, wholeSecondsOf } from '@/features/conversations/model/live-wave';
import type { LiveLevels } from '@/features/conversations/model/live-wave';
import type {
  NoteRecorder,
  NoteRecorderPhase,
  RecordedNote,
} from '@/features/conversations/model/voice-note';
import { WEB_NOTE_TYPES } from '@/features/conversations/constants/voice-note.constant';

type Take = {
  stream: MediaStream;
  recorder: MediaRecorder;
  context: AudioContext;
  analyser: AnalyserNode;
  chunks: Blob[];
  startedAt: number;
};

const supported = (): boolean =>
  typeof navigator !== 'undefined' &&
  typeof navigator.mediaDevices?.getUserMedia === 'function' &&
  typeof MediaRecorder !== 'undefined';

const pickType = (): string =>
  WEB_NOTE_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';

const levelOf = (analyser: AnalyserNode, samples: Uint8Array<ArrayBuffer>): number => {
  analyser.getByteTimeDomainData(samples);
  const peak = samples.reduce((loudest, sample) => Math.max(loudest, Math.abs(sample - 128)), 0);
  return Math.min(1, peak / 128);
};

const dataUriOf = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('the note could not be read'));
    reader.readAsDataURL(blob);
  });

const stopped = (recorder: MediaRecorder): Promise<void> =>
  new Promise((resolve) => {
    if (recorder.state === 'inactive') resolve();
    else recorder.addEventListener('stop', () => resolve(), { once: true });
  });

async function open(): Promise<Take> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const type = pickType();
  const recorder = new MediaRecorder(
    stream,
    type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined
  );
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  context.createMediaStreamSource(stream).connect(analyser);
  const take: Take = { stream, recorder, context, analyser, chunks: [], startedAt: Date.now() };
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) take.chunks.push(event.data);
  });
  recorder.start(RECORDER_TICK_MS);
  return take;
}

function close(take: Take): void {
  if (take.recorder.state !== 'inactive') take.recorder.stop();
  take.stream.getTracks().forEach((track) => track.stop());
  void take.context.close().catch(() => undefined);
}

export function useNoteRecorder(): NoteRecorder {
  const [phase, setPhase] = useState<NoteRecorderPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const live = useSharedValue<LiveLevels>(LIVE_EMPTY);
  const take = useRef<Take | null>(null);
  const all = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const halt = (): Take | null => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    const current = take.current;
    take.current = null;
    if (current) close(current);
    setPhase('idle');
    return current;
  };

  const start = async (onLimit: () => void): Promise<boolean> => {
    if (phase !== 'idle' || !supported()) return false;
    setPhase('starting');
    try {
      take.current = await open();
    } catch {
      setPhase('idle');
      return false;
    }
    const samples = new Uint8Array(take.current.analyser.fftSize);
    all.current = [];
    live.set(LIVE_EMPTY);
    setElapsedMs(0);
    setPhase('recording');
    timer.current = setInterval(() => {
      const current = take.current;
      if (!current) return;
      const level = levelOf(current.analyser, samples);
      all.current.push(level);
      setElapsedMs((shown) => wholeSecondsOf(shown, Date.now() - current.startedAt));
      live.set(pushLevel(live.get(), level, LIVE_LEVELS));
      if (Date.now() - current.startedAt >= VOICE_NOTE_MAX_MS) onLimit();
    }, RECORDER_TICK_MS);
    return true;
  };

  const finish = async (): Promise<RecordedNote | null> => {
    const current = take.current;
    if (!current) return null;
    const done = stopped(current.recorder);
    halt();
    await done;
    const durationMs = Date.now() - current.startedAt;
    const mime = noteMimeOf(current.recorder.mimeType || current.chunks[0]?.type || '');
    if (mime === null || !keepsNote(durationMs, VOICE_NOTE_MIN_MS)) return null;
    const blob = new Blob(current.chunks, { type: current.recorder.mimeType });
    return { uri: await dataUriOf(blob), mime, durationMs, peaks: bucketPeaks(all.current) };
  };

  const cancel = () => void halt();

  return { supported: supported(), phase, elapsedMs, live, start, finish, cancel };
}
