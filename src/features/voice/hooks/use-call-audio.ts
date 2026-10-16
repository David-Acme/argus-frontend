import { useCallback, useEffect, useState } from 'react';
import type { CallAudioDevice, CallAudioSupport } from '@/core/types';
import { currentCallAudio } from '@/features/voice/services/call-audio';

export type CallAudio = {
  devices: CallAudioDevice[];
  support: CallAudioSupport;
  select: (device: CallAudioDevice) => void;
  showRoutePicker: () => void;
};

export function useCallAudio(enabled: boolean): CallAudio {
  const [devices, setDevices] = useState<CallAudioDevice[]>([]);
  const [generation, setGeneration] = useState(0);
  const refresh = useCallback(() => setGeneration((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    void currentCallAudio()
      .devices()
      .then((next) => {
        if (alive) setDevices(next);
      });
    return () => {
      alive = false;
    };
  }, [enabled, generation]);

  useEffect(() => {
    if (!enabled) return;
    return currentCallAudio().subscribe(refresh);
  }, [enabled, refresh]);

  const select = useCallback(
    (device: CallAudioDevice) => {
      void currentCallAudio().select(device).then(refresh);
    },
    [refresh],
  );

  const showRoutePicker = useCallback(() => {
    void currentCallAudio().showRoutePicker();
  }, []);

  return { devices, support: currentCallAudio().support, select, showRoutePicker };
}
