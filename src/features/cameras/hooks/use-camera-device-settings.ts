import { useCallback } from 'react';
import type { ICameraDeviceStatus, ICameraSettings } from '@/core/interfaces';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { optimisticStatus } from '@/features/cameras/model/camera-device';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';

export type CameraDeviceSettingsControls = {
  apply: (body: ICameraSettings) => Promise<void>;
  busy: boolean;
};

type DeviceSettingsInput = {
  cameraId: string;
  status: ICameraDeviceStatus | null;
  onApplied: (status: ICameraDeviceStatus | null) => void;
};

export function useCameraDeviceSettings({ cameraId, status, onApplied }: DeviceSettingsInput): CameraDeviceSettingsControls {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();

  const apply = useCallback(
    async (body: ICameraSettings) => {
      const previous = status;
      onApplied(optimisticStatus(previous, body));
      const result = await run({
        call: () => cameraControlService.settings(cameraId, body),
        errorTitle: t('screens.cameras.device-refused'),
      });
      onApplied(result ? (result.info ?? optimisticStatus(previous, body)) : previous);
    },
    [cameraId, onApplied, run, status, t],
  );

  return { apply, busy: pending };
}
