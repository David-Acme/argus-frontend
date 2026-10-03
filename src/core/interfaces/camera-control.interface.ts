import type { DayNightMode } from '@/core/types';

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
}

export interface ICameraTalk {
  text: string;
  lang?: 'es' | 'en';
}

export interface ICameraCapabilities {
  ptz?: boolean;
  presets?: boolean;
  talk?: boolean;
  privacy?: boolean;
  led?: boolean;
  dayNight?: boolean;
  motion?: boolean;
  autoTrack?: boolean;
  alarm?: boolean;
  streamOnly?: boolean;
}

export interface ICameraSnapshot {
  image: string;
  capturedAt: number;
}
