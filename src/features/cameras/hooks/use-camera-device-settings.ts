import { useCallback, useState } from 'react';
import type { ICameraDeviceStatus, ICameraSettings } from '@/core/interfaces';
import type { ConfirmRequest } from '@/core/types';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { optimisticStatus, resolvedStatus } from '@/features/cameras/model/camera-device';
import { confirm } from '@/shared/libs/confirm';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';

export type CameraSettingApplyOptions = {
  confirm?: ConfirmRequest;
};

export type CameraDeviceSettingsControls = {
  apply: (body: ICameraSettings, options?: CameraSettingApplyOptions) => Promise<void>;
  busy: boolean;
  privacyBusy: boolean;
};

type DeviceSettingsInput = {
  cameraId: string;
  status: ICameraDeviceStatus | null;
  onApplied: (status: ICameraDeviceStatus | null) => void;
};

export function useCameraDeviceSettings({ cameraId, status, onApplied }: DeviceSettingsInput): CameraDeviceSettingsControls {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();
  const [applying, setApplying] = useState<ICameraSettings | null>(null);

  const apply = useCallback(
    async (body: ICameraSettings, options?: CameraSettingApplyOptions) => {
      if (options?.confirm && !(await confirm(options.confirm))) return;
      const previous = status;
      onApplied(optimisticStatus(previous, body));
      setApplying(body);
      try {
        const response = await run({
          call: () => cameraControlService.settings(cameraId, body),
          errorTitle: t('screens.cameras.device-refused'),
        });
        onApplied(resolvedStatus({ response, previous, body }));
      } finally {
        setApplying(null);
      }
    },
    [cameraId, onApplied, run, status, t],
  );

  return { apply, busy: pending, privacyBusy: pending && applying?.privacy !== undefined };
}
