import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraTalkMode } from '@/core/types';
import { ensurePermission } from '@/shared/libs/permission-prompt';
import {
  CameraCall,
  type CameraCallSnapshot,
} from '@/features/cameras/services/camera-call.service';

export type CameraCallControls = {
  snapshot: CameraCallSnapshot | null;
  start: (mode: CameraTalkMode, listen: boolean) => void;
  allowMicrophone: () => void;
  end: () => void;
  setMuted: (muted: boolean) => void;
  talkStart: () => void;
  talkEnd: () => void;
};

export function useCameraCall(cameraId: string): CameraCallControls {
  const call = useRef<CameraCall | null>(null);
  const holding = useRef(false);
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
    [cameraId]
  );

  const start = useCallback(
    (mode: CameraTalkMode, listen: boolean) => {
      void ensurePermission('microphone').then(() => open(mode, listen));
    },
    [open]
  );

  const allowMicrophone = useCallback(() => {
    const current = call.current?.current;
    if (!current) return;
    void ensurePermission('microphone').then((granted) => {
      if (granted && call.current?.current === current) open(current.mode, current.listening);
    });
  }, [open]);

  const setMuted = useCallback((muted: boolean) => call.current?.setMuted(muted), []);
  const talkStart = useCallback(() => {
    holding.current = true;
    void ensurePermission('microphone').then((granted) => {
      if (!granted || !holding.current) return;
      if (call.current?.current.mode !== 'push') open('push', false);
      void call.current?.pressToTalk();
    });
  }, [open]);
  const talkEnd = useCallback(() => {
    holding.current = false;
    call.current?.releaseToTalk();
  }, []);

  useEffect(() => end, [cameraId, end]);

  return {
    snapshot,
    start,
    allowMicrophone,
    end,
    setMuted,
    talkStart,
    talkEnd,
  };
}
