import { useCallback, useMemo } from 'react';
import { t } from '@/core/i18n';
import type { CameraPatrol, CameraPatrolAnswer, CameraPatrolPatch, ResourceMatch } from '@/core/types';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { isEmptyPatrolPatch, withPatrolPatch } from '@/features/cameras/model/camera-patrol';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { runServiceAction } from '@/shared/libs/service-action';

type CameraPatrolInput = {
  cameraId: string;
  enabled: boolean;
};

export type CameraPatrolControls = {
  patrol: CameraPatrol | null;
  loaded: boolean;
  failed: boolean;
  save: (patch: CameraPatrolPatch) => Promise<boolean>;
  remove: () => Promise<boolean>;
};

export function useCameraPatrol({ cameraId, enabled }: CameraPatrolInput): CameraPatrolControls {
  const load = useCallback(() => cameraControlService.patrol(cameraId), [cameraId]);
  const resources = useMemo<readonly ResourceMatch[]>(
    () => [{ domain: 'camera', scope: 'status', id: Number(cameraId) }],
    [cameraId],
  );
  const resource = useRemoteResource<CameraPatrolAnswer>({
    cacheKey: VIEW_CACHE_KEYS.cameraPatrol,
    scope: cameraId,
    load,
    enabled,
    resources,
  });
  const mutate = resource.mutate;
  const patrol = resource.data?.patrol ?? null;

  const save = useCallback(
    async (patch: CameraPatrolPatch): Promise<boolean> => {
      if (isEmptyPatrolPatch(patch)) return true;
      let before: CameraPatrolAnswer | null = null;
      mutate((previous) => {
        before = previous;
        return { patrol: withPatrolPatch(previous?.patrol ?? null, patch, Number(cameraId)) };
      });
      const result = await runServiceAction({
        call: () => cameraControlService.setPatrol(cameraId, patch),
        success: t('screens.cameras.patrol.saved'),
        errorTitle: t('screens.cameras.patrol.save-failed'),
      });
      const next = result?.info ?? null;
      mutate(() => next ?? before);
      return next !== null;
    },
    [cameraId, mutate],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    const result = await runServiceAction({
      confirm: {
        title: t('screens.cameras.patrol.remove-title'),
        description: t('screens.cameras.patrol.remove-description'),
        confirmLabel: t('common.confirm-delete'),
        intent: 'danger',
      },
      call: () => cameraControlService.removePatrol(cameraId),
      success: t('screens.cameras.patrol.removed'),
      errorTitle: t('screens.cameras.patrol.remove-failed'),
    });
    const next = result?.info ?? null;
    if (next) mutate(() => next);
    return next !== null;
  }, [cameraId, mutate]);

  return {
    patrol,
    loaded: resource.data !== null,
    failed: resource.status === 'failed',
    save,
    remove,
  };
}
