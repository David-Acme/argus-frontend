import type { CameraDriverKind, CameraRecordMode, ZonePoint, ZoneType } from '@/core/types';

export interface ICameraCreate {
  name: string;
  ip: string;
  port?: number;
  manufacturer?: string;
  model?: string;
  username?: string;
  password?: string;
  cloudUsername?: string;
  cloudPassword?: string;
  driver?: CameraDriverKind;
  icon?: string;
  recordMode?: CameraRecordMode;
  retentionDays?: number;
  streamPath?: string;
  subStreamPath?: string;
}

export type ICameraUpdate = Partial<ICameraCreate> & { isEnabled?: boolean };

export interface IZoneCreate {
  cameraId: number;
  name: string;
  points: ZonePoint[];
  zoneType?: ZoneType;
  color?: string;
  isEnabled?: boolean;
}

export type IZoneUpdate = Partial<Omit<IZoneCreate, 'cameraId'>>;
