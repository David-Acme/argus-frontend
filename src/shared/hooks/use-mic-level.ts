/* eslint-disable react-hooks/immutability */
import { ORB_AUDIO_ATTACK_MS, ORB_AUDIO_RELEASE_MS } from '@/shared/constants';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

type UseMicLevelResult = {
  /** Smoothed audio amplitude in the 0..1 range, written as a shared value. */
  level: SharedValue<number>;
  isRecording: boolean;
  /** Human-readable error when the microphone cannot be started (permission, etc). */
  error: string | null;
  /** Toggles the microphone. Resolves to `true` when it started recording. */
  toggle: () => Promise<boolean>;
};

const POLL_INTERVAL_MS = 40;
const METER_FLOOR_DB = -55;

function amplitudeFromDbfs(db: number): number {
  if (Number.isNaN(db)) {
    return 0;
  }
  const d = Math.min(0, Math.max(METER_FLOOR_DB, db));
  return Math.min(1, Math.max(0, Math.pow((d - METER_FLOOR_DB) / -METER_FLOOR_DB, 1.5)));
}

/**
 * Live microphone level for the orb. Works on native and web (expo-audio exposes
 * metering on both via `getStatus().metering`, dBFS). Requests the recording
 * permission before starting, then polls the recorder and writes a smoothed 0..1
 * amplitude into a shared value — fast attack, slow release — no React re-renders.
 */
export function useMicLevel(): UseMicLevelResult {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const level = useSharedValue(0);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const id = setInterval(() => {
      const target = amplitudeFromDbfs(recorder.getStatus().metering ?? -160);
      const duration = target >= level.value ? ORB_AUDIO_ATTACK_MS : ORB_AUDIO_RELEASE_MS;
      level.value = withTiming(target, { duration });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRecording, recorder, level]);

  const toggle = useCallback(async () => {
    if (isRecording) {
      await recorder.stop();
      level.value = withTiming(0, { duration: ORB_AUDIO_RELEASE_MS * 1.5 });
      setIsRecording(false);
      setError(null);
      return false;
    }
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError('Permiso de micrófono denegado');
        return false;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setError(null);
      return true;
    } catch (reason) {
      setIsRecording(false);
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar el micrófono');
      return false;
    }
  }, [isRecording, recorder, level]);

  return { level, isRecording, error, toggle };
}

