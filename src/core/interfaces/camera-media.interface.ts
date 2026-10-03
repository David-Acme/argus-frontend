import type { CameraStreamQuality, CameraStreamState } from '@/core/types';

export interface ICameraMediaSink {
  resetStream(): void;
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
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
