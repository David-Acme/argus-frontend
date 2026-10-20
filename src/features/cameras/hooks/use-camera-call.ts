import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraTalkMode } from '@/core/types';
import { ensurePermission } from '@/shared/libs/permission-prompt';
import { CameraCall, type CameraCallSnapshot } from '@/features/cameras/services/camera-call.service';

export type CameraCallControls = {
  snapshot: CameraCallSnapshot | null;
  start: (mode: CameraTalkMode, listen: boolean) => void;
  allowMicrophone: () => void;
  end: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setListening: (listening: boolean) => void;
  press: () => void;
  release: () => void;
};

export function useCameraCall(cameraId: string): CameraCallControls {
  const call = useRef<CameraCall | null>(null);
  const [snapshot, setSnapshot] = useState<CameraCallSnapshot | null>(null);

  const end = useCallback(() => {
    call.current?.end();
    call.current = null;
    setSnapshot(null);
  }, []);

  const open = useCallback(
    (mode: CameraTalkMode, listen: boolean) => {
      call.current?.end();
      const next = new CameraCall({ cameraId, mode, listen });
      call.current = next;
      next.subscribe((value) => {
        if (call.current === next) setSnapshot(value);
      });
      void next.start();
    },
    [cameraId],
  );

  const start = useCallback(
    (mode: CameraTalkMode, listen: boolean) => {
      void ensurePermission('microphone').then(() => open(mode, listen));
    },
    [open],
  );

  const allowMicrophone = useCallback(() => {
    const current = call.current?.current;
    if (!current) return;
    void ensurePermission('microphone').then((granted) => {
      if (granted && call.current?.current === current) open(current.mode, current.listening);
    });
  }, [open]);

  const setMuted = useCallback((muted: boolean) => call.current?.setMuted(muted), []);
  const setVolume = useCallback((volume: number) => call.current?.setVolume(volume), []);
  const setListening = useCallback((listening: boolean) => call.current?.setListening(listening), []);
  const press = useCallback(() => void call.current?.pressToTalk(), []);
  const release = useCallback(() => call.current?.releaseToTalk(), []);

  useEffect(() => end, [cameraId, end]);

  return { snapshot, start, allowMicrophone, end, setMuted, setVolume, setListening, press, release };
}
