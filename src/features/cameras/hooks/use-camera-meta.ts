import type { ICameraCacheRow } from '@/core/interfaces';
import { cameraStatusOf } from '@/features/cameras/model/camera-overview';
import { STATUS_LABEL } from '@/features/cameras/model/camera-status';
import { useCameraEnvironmentIndex } from '@/features/security';
import { useTranslation } from '@/shared/hooks/use-translation';

export function useCameraMeta(camera: ICameraCacheRow): string {
  const { t } = useTranslation();
  const place = useCameraEnvironmentIndex().get(camera.id)?.name;
  const status = cameraStatusOf(camera);
  if (!place) return t(STATUS_LABEL[status]);
  return status === 'online' ? place : [place, t(STATUS_LABEL[status])].join(' · ');
}
