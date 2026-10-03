import { VOICE_METER_ATTACK_MS, VOICE_METER_RELEASE_MS } from '@/shared/constants';
import { t } from '@/core/i18n';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

type UseMicLevelResult = {
  level: SharedValue<number>;
  isRecording: boolean;
  error: string | null;
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
      const duration = target >= level.value ? VOICE_METER_ATTACK_MS : VOICE_METER_RELEASE_MS;
      level.value = withTiming(target, { duration });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isRecording, recorder, level]);

  const toggle = useCallback(async () => {
    if (isRecording) {
      await recorder.stop();
      level.value = withTiming(0, { duration: VOICE_METER_RELEASE_MS * 1.5 });
      setIsRecording(false);
      setError(null);
      return false;
    }
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setError(t('common.mic-permission-denied'));
        return false;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setError(null);
      return true;
    } catch (reason) {
      setIsRecording(false);
      setError(reason instanceof Error ? reason.message : t('common.mic-start-failed'));
      return false;
    }
  }, [isRecording, recorder, level]);

  return { level, isRecording, error, toggle };
}

