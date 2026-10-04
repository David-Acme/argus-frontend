import type { ICameraDeviceStatus, ICameraSettings } from '@/core/interfaces';

export function optimisticStatus(status: ICameraDeviceStatus | null, body: ICameraSettings): ICameraDeviceStatus {
  return {
    ...status,
    privacyEnabled: body.privacy ?? status?.privacyEnabled,
    ledEnabled: body.led ?? status?.ledEnabled,
    motionEnabled: body.motion ?? status?.motionEnabled,
    autoTrackEnabled: body.autoTrack ?? status?.autoTrackEnabled,
    dayNightMode: body.dayNight ?? status?.dayNightMode,
    motionSensitivity: body.motionSensitivity ?? status?.motionSensitivity,
  };
}
