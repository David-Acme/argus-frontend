export const CAMERA_LEASE_HOLDERS = ['none', 'argus', 'viewer', 'person'] as const;

export type CameraLeaseHolder = (typeof CAMERA_LEASE_HOLDERS)[number];

export const CAMERA_AIM_ACTIVITIES = ['idle', 'looking', 'following', 'patrolling', 'returning'] as const;

export type CameraAimActivity = (typeof CAMERA_AIM_ACTIVITIES)[number];

export type CameraLeaseAction = 'hold' | 'release';

export type CameraNoAimSector = {
  name: string;
  panFrom: number;
  panTo: number;
  tiltFrom: number;
  tiltTo: number;
};

export type CameraAimSettings = {
  activeLook: boolean;
  followIntruders: boolean;
  patrol: boolean;
  noAimSectors: CameraNoAimSector[];
};

export type CameraAimLease = {
  holder: CameraLeaseHolder;
  userId: number;
  mine: boolean;
  sinceMs: number;
  parkUntilMs: number;
};

export type CameraAimWear = {
  movesToday: number;
  dailyCap: number;
};

export type CameraAim = {
  cameraId: number;
  ptz: boolean;
  homePreset: string | null;
  atHome: boolean;
  pan: number;
  tilt: number;
  lease: CameraAimLease;
  activity: CameraAimActivity;
  settings: CameraAimSettings;
  wear: CameraAimWear;
};

export type CameraAimPatch = Partial<CameraAimSettings>;

export type CameraAimConfig = CameraAimSettings & {
  homePreset: string | null;
};
