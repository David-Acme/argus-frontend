import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { t } from '@/core/i18n';
import type { CameraAim, CameraAimConfig, CameraAimPatch, CameraAimSettings, ResourceMatch } from '@/core/types';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import {
  aimSettingsOf,
  homePresetOf,
  leaseView,
  sightActivity,
  withAimPatch,
  type CameraLeaseView,
  type CameraSightActivity,
  type SectorMark,
} from '@/features/cameras/model/camera-aim';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { runServiceAction } from '@/shared/libs/service-action';

type CameraAimInput = {
  cameraId: string;
  synced: CameraAimConfig | undefined;
  enabled: boolean;
};

export type CameraAimControls = {
  aim: CameraAim | null;
  settings: CameraAimSettings;
  homePreset: string | null;
  lease: CameraLeaseView;
  activity: CameraSightActivity;
  update: (patch: CameraAimPatch) => Promise<boolean>;
  giveBack: () => Promise<boolean>;
  apply: (next: CameraAim) => void;
  readPosition: () => Promise<SectorMark | null>;
  reload: () => Promise<void>;
};

export function useCameraAim({ cameraId, synced, enabled }: CameraAimInput): CameraAimControls {
  const load = useCallback(() => cameraControlService.aim(cameraId), [cameraId]);
  const resources = useMemo<readonly ResourceMatch[]>(
    () => [{ domain: 'camera', scope: 'aim', id: Number(cameraId) }],
    [cameraId],
  );
  const resource = useRemoteResource<CameraAim>({
    cacheKey: VIEW_CACHE_KEYS.cameraAim,
    scope: cameraId,
    load,
    enabled,
    resources,
  });
  const aim = resource.data;
  const mutate = resource.mutate;

  const update = useCallback(
    async (patch: CameraAimPatch): Promise<boolean> => {
      let before: CameraAim | null = null;
      mutate((previous) => {
        before = previous;
        return withAimPatch(previous, patch);
      });
      const result = await runServiceAction({
        call: () => cameraControlService.setAim(cameraId, patch),
        errorTitle: t('screens.cameras.sight.save-failed'),
      });
      const next = result?.info ?? null;
      mutate(() => next ?? before);
      return next !== null;
    },
    [cameraId, mutate],
  );

  const giveBack = useCallback(async (): Promise<boolean> => {
    const result = await runServiceAction({
      call: () => cameraControlService.lease(cameraId, 'release'),
      success: t('screens.cameras.sight.given-back'),
      errorTitle: t('screens.cameras.sight.give-back-failed'),
    });
    const next = result?.info ?? null;
    if (next) mutate(() => next);
    return next !== null;
  }, [cameraId, mutate]);

  const apply = useCallback((next: CameraAim) => mutate(() => next), [mutate]);

  const readPosition = useCallback(async (): Promise<SectorMark | null> => {
    const result = await runServiceAction({
      call: () => cameraControlService.aim(cameraId),
      errorTitle: t('screens.cameras.sight.position-failed'),
    });
    const next = result?.info ?? null;
    if (!next) return null;
    mutate(() => next);
    return { pan: next.pan, tilt: next.tilt };
  }, [cameraId, mutate]);

  return {
    aim,
    settings: aimSettingsOf(aim, synced),
    homePreset: homePresetOf(aim, synced),
    lease: leaseView(aim),
    activity: sightActivity(aim),
    update,
    giveBack,
    apply,
    readPosition,
    reload: resource.reload,
  };
}

export function useViewerLease(cameraId: string, active: boolean, onAim: (aim: CameraAim) => void): void {
  const report = useRef(onAim);

  useEffect(() => {
    report.current = onAim;
  }, [onAim]);

  useEffect(() => {
    if (!active) return undefined;
    let held = false;
    const hold = () => {
      if (held) return;
      held = true;
      void cameraControlService.lease(cameraId, 'hold').then((result) => {
        if (result.ok && result.info) report.current(result.info);
      });
    };
    const release = () => {
      if (!held) return;
      held = false;
      void cameraControlService.lease(cameraId, 'release');
    };
    hold();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') hold();
      else release();
    });
    return () => {
      subscription.remove();
      release();
    };
  }, [active, cameraId]);
}
