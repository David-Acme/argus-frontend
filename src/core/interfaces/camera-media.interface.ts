import type { CameraStreamQuality, CameraStreamState } from '@/core/types';

export interface ICameraMediaSink {
  resetStream(): void;
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
  bufferedBytes(): number;
}

export interface ICameraMediaEvents {
  onState?: (state: CameraStreamState) => void;
  onError?: (code: string, message: string) => void;
  onStats?: (stats: ICameraLiveStats) => void;
}

export interface ICameraLiveStats {
  width: number;
  height: number;
  fps: number;
  audio: boolean;
}

export interface ICameraMediaOpenInput {
  cameraId: number;
  quality: CameraStreamQuality;
  fastStart?: boolean;
  sink: ICameraMediaSink;
  events?: ICameraMediaEvents;
}

export interface ICameraMediaSession {
  retry(): void;
  close(): void;
}

export interface ICameraMediaService {
  open(input: ICameraMediaOpenInput): Promise<ICameraMediaSession>;
}
