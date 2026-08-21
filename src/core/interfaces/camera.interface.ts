import type { CameraDriverKind, CameraRecordMode, ZonePoint, ZoneType } from '@/core/types';

/** Wire payloads of the camera and zone REST endpoints. */
export interface ICameraCreate {
  name: string;
  ip: string;
  port?: number;
  manufacturer?: string;
  model?: string;
  username?: string;
  /** Sent on create, never stored locally. */
  password?: string;
  /** Vendor cloud account; the talk channel needs it. */
  cloudUsername?: string;
  cloudPassword?: string;
  driver?: CameraDriverKind;
  /** Icon key from `CAMERA_ICONS`. */
  icon?: string;
  recordMode?: CameraRecordMode;
  retentionDays?: number;
}

export type ICameraUpdate = Partial<ICameraCreate> & { isEnabled?: boolean };

export interface IZoneCreate {
  cameraId: number;
  name: string;
  /** Normalized [0..1]; the backend takes 3 to 64 points. */
  points: ZonePoint[];
  zoneType?: ZoneType;
  color?: string;
  isEnabled?: boolean;
}

export type IZoneUpdate = Partial<Omit<IZoneCreate, 'cameraId'>>;
