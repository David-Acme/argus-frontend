export type DevicePermissionId = 'microphone' | 'notifications' | 'background' | 'full-screen' | 'exact-alarms';

export type DevicePermission = {
  id: DevicePermissionId;
  granted: boolean;
};
