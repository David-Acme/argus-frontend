export type DevicePermissionId = 'microphone' | 'notifications' | 'full-screen' | 'exact-alarms';

export type DevicePermission = {
  id: DevicePermissionId;
  granted: boolean;
};
