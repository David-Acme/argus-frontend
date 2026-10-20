export type CameraPatrolWindow = {
  startHour: number;
  endHour: number;
};

export type CameraPatrol = {
  cameraId: number;
  stops: string[];
  dwellSeconds: number;
  enabled: boolean;
  window: CameraPatrolWindow | null;
  createdAt: number;
  updatedAt: number | null;
};

export type CameraPatrolPatch = {
  stops?: string[];
  dwellSeconds?: number;
  enabled?: boolean;
  window?: CameraPatrolWindow | null;
};

export type CameraPatrolAnswer = {
  patrol: CameraPatrol | null;
};
