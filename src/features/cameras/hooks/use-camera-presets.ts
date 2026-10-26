import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { nextPresetName, parsePresets } from '@/features/cameras/model/camera-presets';
import type { CameraPreset } from '@/features/cameras/model/camera-presets';

export type CameraPresetsInput = { cameraId: string; enabled: boolean; onHomeSet: () => void };

export type CameraPresets = {
  presets: readonly CameraPreset[];
  goto: (preset: CameraPreset) => void;
  goHome: () => void;
  save: () => Promise<void>;
  setHome: (preset: CameraPreset) => Promise<void>;
};

export function useCameraPresets({
  cameraId,
  enabled,
  onHomeSet,
}: CameraPresetsInput): CameraPresets {
  const { t } = useTranslation();
  const { run } = useServiceAction();
  const resource = useRemoteResource<unknown>({
    cacheKey: VIEW_CACHE_KEYS.cameraPresets,
    scope: cameraId,
    load: () => cameraControlService.presets(cameraId),
    enabled,
    resources: [{ domain: 'camera', scope: 'status', id: Number(cameraId) }],
  });
  const presets = parsePresets(resource.data);
  const reload = resource.reload;

  const move = (preset: CameraPreset | null) =>
    void run({
      call: () =>
        cameraControlService.preset(
          cameraId,
          preset ? { action: 'goto', id: preset.id } : { action: 'go_home' }
        ),
      errorTitle: t('screens.cameras.sight.move-failed'),
    });

  const save = async () => {
    const saved = await run({
      call: () =>
        cameraControlService.preset(cameraId, {
          action: 'save',
          name: nextPresetName(presets, t('screens.cameras.preset-name')),
        }),
      success: t('screens.cameras.preset-saved'),
      errorTitle: t('screens.cameras.preset-save-failed'),
    });
    if (saved) await reload();
  };

  const setHome = async (preset: CameraPreset) => {
    const saved = await run({
      call: () => cameraControlService.preset(cameraId, { action: 'set_home', id: preset.id }),
      success: t('screens.cameras.sight.home-saved'),
      errorTitle: t('screens.cameras.sight.home-failed'),
    });
    if (saved) onHomeSet();
  };

  return { presets, goto: (preset) => move(preset), goHome: () => move(null), save, setHome };
}
