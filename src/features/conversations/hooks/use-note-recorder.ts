import { AudioQuality, IOSOutputFormat, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import type { AudioMode, RecordingOptions } from 'expo-audio';
import { useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { VOICE_NOTE_MAX_MS, VOICE_NOTE_MIN_MS } from '@/core/services/conversation';
import { ensurePermission } from '@/shared/libs/permission-prompt';
import {
  bucketPeaks,
  keepsNote,
  levelOfDecibels,
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

const OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM },
  web: {},
};

const RECORDING: AudioMode = {
  playsInSilentMode: true,
  interruptionMode: 'doNotMix',
  allowsRecording: true,
  shouldPlayInBackground: false,
  shouldRouteThroughEarpiece: false,
};

const PLAYING: AudioMode = { ...RECORDING, allowsRecording: false };

export function useNoteRecorder(): NoteRecorder {
  const recorder = useAudioRecorder(OPTIONS);
  const [phase, setPhase] = useState<NoteRecorderPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const live = useSharedValue<LiveLevels>(LIVE_EMPTY);
  const all = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const halt = async () => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    await recorder.stop().catch(() => undefined);
    await setAudioModeAsync(PLAYING).catch(() => undefined);
    setPhase('idle');
  };

  const start = async (onLimit: () => void): Promise<boolean> => {
    if (phase !== 'idle') return false;
    setPhase('starting');
    if (!(await ensurePermission('microphone'))) {
      setPhase('idle');
      return false;
    }
    await setAudioModeAsync(RECORDING);
    await recorder.prepareToRecordAsync();
    recorder.record();
    all.current = [];
    live.set(LIVE_EMPTY);
    setElapsedMs(0);
    setPhase('recording');
    timer.current = setInterval(() => {
      const status = recorder.getStatus();
      const level = levelOfDecibels(status.metering);
      all.current.push(level);
      setElapsedMs((shown) => wholeSecondsOf(shown, status.durationMillis));
      live.set(pushLevel(live.get(), level, LIVE_LEVELS));
      if (status.durationMillis >= VOICE_NOTE_MAX_MS) onLimit();
    }, RECORDER_TICK_MS);
    return true;
  };

  const finish = async (): Promise<RecordedNote | null> => {
    const durationMs = recorder.getStatus().durationMillis;
    await halt();
    const uri = recorder.uri;
    if (!uri || !keepsNote(durationMs, VOICE_NOTE_MIN_MS)) return null;
    return { uri, mime: 'audio/mp4', durationMs, peaks: bucketPeaks(all.current) };
  };

  const cancel = () => void halt();

  return { supported: true, phase, elapsedMs, live, start, finish, cancel };
}
