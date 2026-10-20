export type DevicePermissionId = 'microphone' | 'notifications' | 'background' | 'full-screen' | 'exact-alarms';

export type DevicePermission = {
  id: DevicePermissionId;
  granted: boolean;
};

export type RuntimePermission = 'microphone' | 'notifications' | 'bluetooth' | 'camera';

export type PermissionAnswer = {
  granted: boolean;
  canAskAgain: boolean;
};
