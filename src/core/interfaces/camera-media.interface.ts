import type { CameraStreamQuality, CameraStreamState } from '@/core/types';

/** Native decoder surface fed by the camera media service. */
export interface ICameraMediaSink {
  /** Drops buffered bytes and waits for the next init segment. */
  resetStream(): void;
  /** type 1 = fMP4 init segment, type 2 = media fragment. */
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
  /** Bytes queued in the decoder; gates the server credit release. */
  bufferedBytes(): number;
}

export interface ICameraMediaEvents {
  onState?: (state: CameraStreamState) => void;
  onError?: (code: string, message: string) => void;
}

export interface ICameraMediaOpenInput {
  cameraId: number;
  quality: CameraStreamQuality;
  sink: ICameraMediaSink;
  events?: ICameraMediaEvents;
}

export interface ICameraMediaSession {
  close(): void;
}

export interface ICameraMediaService {
  open(input: ICameraMediaOpenInput): Promise<ICameraMediaSession>;
}
