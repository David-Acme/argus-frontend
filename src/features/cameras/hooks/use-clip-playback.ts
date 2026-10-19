import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ICameraClip, ICameraClipContent } from '@/core/interfaces';
import { clipDurationMs, clipPaceSteps, decodeBase64, splitClipFile, type ClipFile } from '@/features/cameras/model/clip-media';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';
import { clipImageUri, isImageClip } from '@/features/cameras/model/camera-clips';

export type ClipPlaybackState = 'idle' | 'loading' | 'ready' | 'failed' | 'unsupported';

export type ClipPlayback = {
  state: ClipPlaybackState;
  clip: ICameraClip | null;
  file: ClipFile | null;
  image: string | null;
  open: (clip: ICameraClip) => void;
  close: () => void;
};

export function clipContentBytes(content: ICameraClipContent): Uint8Array {
  return decodeBase64(content.base64);
}

export function useClipPlayback(cameraId: string): ClipPlayback {
  const [state, setState] = useState<ClipPlaybackState>('idle');
  const [clip, setClip] = useState<ICameraClip | null>(null);
  const [file, setFile] = useState<ClipFile | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const run = useRef(0);

  const open = useCallback(
    (next: ICameraClip) => {
      const current = run.current + 1;
      run.current = current;
      setClip(next);
      setFile(null);
      setImage(null);
      setState('loading');
      void (async () => {
        const preview = await cameraClipsService.preview(cameraId, next.id);
        if (current !== run.current) return;
        if (!preview.ok || !preview.info) {
          setState('failed');
          return;
        }
        const content = await cameraClipsService.content(preview.info.token);
        if (current !== run.current) return;
        if (!content.ok || !content.info) {
          setState('failed');
          return;
        }
        if (isImageClip(next)) {
          setImage(clipImageUri(content.info.mimeType || next.contentType, content.info.base64));
          setState('ready');
          return;
        }
        const split = splitClipFile(clipContentBytes(content.info));
        if (current !== run.current) return;
        if (!split) {
          setState('unsupported');
          return;
        }
        setFile(split);
        setState('ready');
      })();
    },
    [cameraId],
  );

  const close = useCallback(() => {
    run.current += 1;
    setFile(null);
    setImage(null);
    setClip(null);
    setState('idle');
  }, []);

  return { state, clip, file, image, open, close };
}

export type ClipSink = {
  push: (type: number, keyframe: boolean, data: ArrayBuffer) => void;
};

export const CLIP_INIT_TYPE = 1;
export const CLIP_FRAME_TYPE = 2;

const PROGRESS_TICK_MS = 120;

export function useClipQueue(file: ClipFile | null, sink: ClipSink | null, onEnded: () => void): void {
  const [, setProgress] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAt = useRef(0);
  const steps = useMemo(() => (file ? clipPaceSteps(file.fragments) : []), [file]);
  const totalMs = useMemo(() => (file ? Math.max(1, clipDurationMs(file.fragments)) : 1), [file]);
  const ended = useRef(onEnded);

  useEffect(() => {
    ended.current = onEnded;
  }, [onEnded]);

  const clear = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    if (ticker.current !== null) {
      clearInterval(ticker.current);
      ticker.current = null;
    }
  }, []);

  const play = useCallback(() => {
    if (!file || !sink) return;
    clear();
    startedAt.current = Date.now();
    sink.push(CLIP_INIT_TYPE, true, toArrayBuffer(file.init));
    for (const step of steps) {
      const fragment = file.fragments[step.index];
      if (!fragment) continue;
      const bytes = toArrayBuffer(fragment.bytes);
      timers.current.push(
        setTimeout(() => sink.push(CLIP_FRAME_TYPE, fragment.keyframe, bytes), step.atMs),
      );
    }
    timers.current.push(setTimeout(() => ended.current(), totalMs));
    ticker.current = setInterval(() => {
      setProgress(Math.min(1, (Date.now() - startedAt.current) / totalMs));
    }, PROGRESS_TICK_MS);
  }, [clear, file, sink, steps, totalMs]);

  useEffect(() => {
    if (!file || !sink) return undefined;
    play();
    return clear;
  }, [clear, file, play, sink]);

}

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
