import { useEffect, useEffectEvent, useState } from 'react';
import type { ICameraMediaSink } from '@/core/interfaces';
import { PREVIEW_REVEAL_MS } from '@/features/cameras/constants/preview.constant';
import type { PreviewState } from '@/features/cameras/model/camera-preview';
import { cameraPreviewMux } from '@/features/cameras/services/camera-preview-mux';
import { previewBoard } from '@/features/cameras/services/preview-board';

export type PreviewSink = { sink: ICameraMediaSink; dispose: () => void };

export type PreviewStreamInput = {
  cameraId: string;
  order: number;
  fastStart: boolean;
  ready: boolean;
  open: () => PreviewSink | null;
};

export function usePreviewStream({ cameraId, order, fastStart, ready, open }: PreviewStreamInput) {
  const [state, setState] = useState<PreviewState>('waiting');
  const [revealed, setRevealed] = useState(false);
  const openSink = useEffectEvent(open);
  const live = state === 'live';

  useEffect(() => {
    const id = Number(cameraId);
    if (!ready || !Number.isFinite(id) || id <= 0) return;
    const opened = openSink();
    if (!opened) return;
    const detach = cameraPreviewMux.attach({
      cameraId: id,
      order,
      fastStart,
      sink: opened.sink,
      onState: setState,
    });
    return () => {
      detach();
      opened.dispose();
      setState('waiting');
    };
  }, [cameraId, fastStart, order, ready]);

  useEffect(() => {
    previewBoard.markLive(cameraId, live);
    if (!live) return;
    const timer = setTimeout(() => setRevealed(true), PREVIEW_REVEAL_MS);
    return () => {
      clearTimeout(timer);
      previewBoard.markLive(cameraId, false);
      setRevealed(false);
    };
  }, [cameraId, live]);

  return { state, shown: live && revealed };
}
