import type {
  CameraDriverKind,
  CameraFeatureKey,
  CameraFormFactor,
  CameraProbeStepId,
  CameraProbeStepStatus,
  DayNightMode,
} from '@/core/types';

export interface ICameraPtz {
  x?: number;
  y?: number;
  angle?: number;
}

export interface ICameraPreset {
  action: 'goto' | 'save' | 'delete';
  id?: string;
  name?: string;
}

export interface ICameraSettings {
  privacy?: boolean;
  led?: boolean;
  dayNight?: DayNightMode;
  motion?: boolean;
  motionSensitivity?: number;
  autoTrack?: boolean;
  alarm?: boolean;
  alarmVolume?: number;
  frameRate?: number;
}

export interface ICameraDeviceStatus {
  ok?: boolean;
  model?: string;
  firmware?: string;
  mac?: string;
  privacyEnabled?: boolean | null;
  ledEnabled?: boolean | null;
  motionEnabled?: boolean | null;
  autoTrackEnabled?: boolean | null;
  dayNightMode?: string | null;
  motionSensitivity?: number;
  sdCard?: ICameraSdCard;
  video?: ICameraVideoProfile;
}

export interface ICameraVideoProfile {
  resolution: string;
  frameRate: number;
  encoding: string;
  frameRates: number[];
  resolutions: string[];
}

export interface ICameraSdCard {
  status: string;
  total: string;
  free: string;
}

export interface ICameraTalk {
  text: string;
  lang?: 'es' | 'en';
}

export interface ICameraCapabilities {
  ptz?: boolean;
  presets?: boolean;
  talk?: boolean;
  microphone?: boolean;
  privacy?: boolean;
  led?: boolean;
  dayNight?: boolean;
  motion?: boolean;
  autoTrack?: boolean;
  alarm?: boolean;
  sdCard?: boolean;
  streamOnly?: boolean;
  catalogId?: string;
}

export interface ICameraCatalogDefaults {
  port: number;
  onvifPort: number;
  username: string;
  streamPath: string;
  subStreamPath: string;
}

export interface ICameraCatalogModel {
  id: string;
  brand: string;
  manufacturer: string;
  model: string;
  driver: CameraDriverKind;
  formFactor: CameraFormFactor;
  outdoor: boolean;
  generic: boolean;
  resolution: string;
  subResolution: string;
  defaults: ICameraCatalogDefaults;
  features: Record<CameraFeatureKey, boolean>;
  note: string;
}

export interface ICameraCatalog {
  models: ICameraCatalogModel[];
}

export interface ICameraProbeInput {
  driver: CameraDriverKind;
  ip: string;
  port: number;
  username: string;
  password: string;
  cloudUsername: string;
  cloudPassword: string;
  streamPath: string;
  subStreamPath: string;
  cameraId?: number;
}

export interface ICameraProbeStep {
  id: CameraProbeStepId;
  status: CameraProbeStepStatus;
  code: string;
  detail: string;
}

export interface ICameraProbeStream {
  videoCodec: string;
  audioCodec: string;
  width: number;
  height: number;
  subWidth?: number;
  subHeight?: number;
}

export interface ICameraProbeResult {
  ok: boolean;
  steps: ICameraProbeStep[];
  stream: ICameraProbeStream;
  device: { model?: string; firmware?: string };
  catalogId: string;
}

export interface ICameraStreamStats {
  codec: string;
  profile: string;
  audio: string;
  width: number;
  height: number;
  fps: number;
  kbps: number;
}

export interface ICameraDetection {
  id: string;
  cameraId: number;
  at: number;
  rule: string;
  severity: string;
  label: string;
  zoneName: string;
}

export interface ICameraOverviewRow {
  id: number;
  lastSeenAt: number;
  sampledAt: number;
  health: string;
  width: number;
  height: number;
  viewers: number;
  stream: ICameraStreamStats | null;
  mainActive: boolean;
  lastEvent: ICameraDetection | null;
}

export interface ICameraOverview {
  cameras: ICameraOverviewRow[];
  events: ICameraDetection[];
}

export interface ICameraSnapshot {
  image: string;
  capturedAt: number;
}
