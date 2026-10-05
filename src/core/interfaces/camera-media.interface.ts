import type {
  CameraLiveNotice,
  CameraRtcStream,
  CameraStreamQuality,
  CameraStreamState,
  CameraTransport,
} from '@/core/types';

export interface ICameraMediaSink {
  resetStream(): void;
  pushFragment(type: number, keyframe: boolean, data: ArrayBuffer): void;
  bufferedBytes(): number;
}

export interface ICameraPictureStats {
  width: number;
  height: number;
  fps: number;
  audio: boolean;
}

export interface ICameraLiveStats extends ICameraPictureStats {
  transport: CameraTransport;
}

export interface ICameraMediaEvents {
  onState?: (state: CameraStreamState) => void;
  onError?: (code: string, message: string) => void;
  onStats?: (stats: ICameraPictureStats) => void;
  onNotice?: (notice: CameraLiveNotice | null) => void;
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

export interface ICameraLiveEvents {
  onState?: (state: CameraStreamState) => void;
  onStats?: (stats: ICameraLiveStats) => void;
  onTransport?: (transport: CameraTransport) => void;
  onRtcStream?: (stream: CameraRtcStream | null) => void;
  onNotice?: (notice: CameraLiveNotice | null) => void;
}

export interface ICameraLiveOpenInput {
  cameraId: number;
  quality: CameraStreamQuality;
  fastStart?: boolean;
  sink: ICameraMediaSink;
  events?: ICameraLiveEvents;
}

export interface ICameraLiveSession extends ICameraMediaSession {
  setAudioEnabled(enabled: boolean): void;
}

export interface ICameraLiveService {
  open(input: ICameraLiveOpenInput): ICameraLiveSession;
}

export interface ICameraWebRtcOffer {
  sdp: string;
  quality: CameraStreamQuality;
}

export interface ICameraWebRtcAnswer {
  type: 'answer';
  sdp: string;
  quality: CameraStreamQuality;
  audio: boolean;
}

export interface ICameraRtcEvents {
  onLive: () => void;
  onStats: (stats: ICameraPictureStats) => void;
  onDrop: (reason: string) => void;
}

export interface ICameraRtcOpenInput {
  cameraId: number;
  quality: CameraStreamQuality;
  events: ICameraRtcEvents;
}

export interface ICameraRtcSession {
  readonly stream: CameraRtcStream | null;
  setAudioEnabled(enabled: boolean): void;
  close(): void;
}

export interface ICameraRtcService {
  supported(): boolean;
  open(input: ICameraRtcOpenInput): Promise<ICameraRtcSession>;
}
