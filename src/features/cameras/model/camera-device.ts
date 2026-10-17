import type {
  ICameraDeviceStatus,
  ICameraSettings,
  IServiceResponse,
} from '@/core/interfaces';
import type { ConfirmRequest } from '@/core/types';

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

export type DeviceStatusResolution = {
  response: IServiceResponse<ICameraDeviceStatus> | null;
  previous: ICameraDeviceStatus | null;
  body: ICameraSettings;
};

export function resolvedStatus({ response, previous, body }: DeviceStatusResolution): ICameraDeviceStatus | null {
  if (!response) return previous;
  return response.info ?? optimisticStatus(previous, body);
}

export type PrivacyConfirmCopy = {
  title: string;
  description: string;
};

export function privacyApplyConfirm(next: boolean, copy: PrivacyConfirmCopy): ConfirmRequest | undefined {
  if (!next) return undefined;
  return { title: copy.title, description: copy.description, intent: 'warning' };
}
