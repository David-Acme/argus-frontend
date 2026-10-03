import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceRecording } from '@/core/types';
import { voiceRecorder } from '../services/voice-recorder';

type VoiceCaptureOptions = {
  maxSeconds: number;
  onRecorded: (recording: VoiceRecording) => void;
  onFailed: (error: unknown) => void;
};

export function useVoiceCapture({ maxSeconds, onRecorded, onFailed }: VoiceCaptureOptions) {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);

  const clearLimit = () => {
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
  };

  const stop = useCallback(async () => {
    if (!active.current) return;
    active.current = false;
    clearLimit();
    setRecording(false);
    setLevel(0);
    try {
      onRecorded(await voiceRecorder.stop());
    } catch (error) {
      onFailed(error);
    }
  }, [onFailed, onRecorded]);

  const start = useCallback(async () => {
    if (active.current) return;
    try {
      await voiceRecorder.start(setLevel);
    } catch (error) {
      onFailed(error);
      return;
    }
    active.current = true;
    setRecording(true);
    limit.current = setTimeout(() => void stop(), maxSeconds * 1000);
  }, [maxSeconds, onFailed, stop]);

  const cancel = useCallback(() => {
    active.current = false;
    clearLimit();
    setRecording(false);
    setLevel(0);
    voiceRecorder.cancel();
  }, []);

  useEffect(() => cancel, [cancel]);

  return { recording, level, start, stop, cancel };
}
