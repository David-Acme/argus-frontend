import type { ICameraCacheRow, ICameraCapabilities, ICameraDeviceStatus } from '@/core/interfaces';
import { useCameraAim, type CameraAimControls } from '@/features/cameras/hooks/use-camera-aim';
import {
  useCameraDeviceSettings,
  type CameraDeviceSettingsControls,
} from '@/features/cameras/hooks/use-camera-device-settings';
import { useCameraFeatures } from '@/features/cameras/hooks/use-camera-features';
import {
  useCameraPatrol,
  type CameraPatrolControls,
} from '@/features/cameras/hooks/use-camera-patrol';
import { useCameraPresets, type CameraPresets } from '@/features/cameras/hooks/use-camera-presets';
import { settingsSectionsOf, type SettingsSection } from '@/features/cameras/model/camera-settings';
import { cameraListening, type CameraListening } from '@/features/cameras/model/camera-watch';
import { useHouseholdWatchman } from '@/features/privacy';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';

export type CameraSettings = {
  camera: ICameraCacheRow;
  features: ICameraCapabilities | null;
  device: ICameraDeviceStatus | null;
  deviceFailed: boolean;
  recheck: () => Promise<void>;
  deviceSettings: CameraDeviceSettingsControls;
  aim: CameraAimControls;
  patrol: CameraPatrolControls;
  presets: CameraPresets;
  listening: CameraListening;
  sections: readonly SettingsSection[];
  access: { update: boolean; remove: boolean; managePresets: boolean };
};

export function useCameraSettings(
  id: string,
  camera: ICameraCacheRow | null
): CameraSettings | null {
  const { can, has, cameraActions, guard } = useCapabilities();
  const update = can('camera', 'update');
  const { features, device, deviceFailed, reloadDevice, applyDevice } = useCameraFeatures(
    id,
    camera
  );
  const deviceSettings = useCameraDeviceSettings({
    cameraId: id,
    status: device,
    onApplied: applyDevice,
  });
  const sections = settingsSectionsOf({
    features,
    update,
    remove: can('camera', 'delete'),
    aim: cameraActions.aim,
    maintenance: guard.maintenance,
  });
  const aim = useCameraAim({
    cameraId: id,
    synced: camera?.aim,
    enabled: sections.includes('gaze'),
  });
  const patrol = useCameraPatrol({ cameraId: id, enabled: sections.includes('patrol') });
  const presets = useCameraPresets({
    cameraId: id,
    enabled: sections.includes('gaze') && features?.presets === true,
    onHomeSet: () => void aim.reload(),
  });
  const household = useHouseholdWatchman({ enabled: has(CAPABILITY.privacyHousehold) });
  if (!camera) return null;
  return {
    camera,
    features,
    device,
    deviceFailed,
    recheck: reloadDevice,
    deviceSettings,
    aim,
    patrol,
    presets,
    listening: cameraListening({
      watchman: camera.watchman,
      noAudio: camera.noAudio,
      masked: cameraPrivacyMasked(camera.privacyState),
      enabled: camera.isEnabled,
      talk: features ? features.talk === true : null,
      household,
    }),
    sections,
    access: {
      update,
      remove: can('camera', 'delete'),
      managePresets: cameraActions.managePresets,
    },
  };
}
