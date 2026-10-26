import type { ICameraCacheRow, ICameraCapabilities } from '@/core/interfaces';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { useAppSirenEnabled } from '@/features/safety';
import { useVoiceCallActive, voiceCallSupported } from '@/features/voice';
import { useCameraAim, useViewerLease } from '@/features/cameras/hooks/use-camera-aim';
import type { CameraAimControls } from '@/features/cameras/hooks/use-camera-aim';
import { useCameraFeatures } from '@/features/cameras/hooks/use-camera-features';
import { useCameraPresets } from '@/features/cameras/hooks/use-camera-presets';
import type { CameraPresets } from '@/features/cameras/hooks/use-camera-presets';
import { useCameraPtz } from '@/features/cameras/hooks/use-camera-ptz';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { useCameraThumbnails } from '@/features/cameras/hooks/use-camera-thumbnails';
import { useLiveStage } from '@/features/cameras/hooks/use-live-stage';
import type { LiveStage } from '@/features/cameras/hooks/use-live-stage';
import { useTalkDock } from '@/features/cameras/hooks/use-talk-dock';
import type { TalkDock } from '@/features/cameras/hooks/use-talk-dock';
import { ptzHoldRenewMs } from '@/features/cameras/model/camera-ptz';
import { settingsSectionsOf } from '@/features/cameras/model/camera-settings';
import type { SettingsSection } from '@/features/cameras/model/camera-settings';
import { liveControlsOf, talkNoteOf } from '@/features/cameras/model/camera-stage';
import type { LiveControls, TalkNote } from '@/features/cameras/model/camera-stage';
import { sirenOffered } from '@/features/cameras/model/siren';

export type CameraLive = {
  camera: ICameraCacheRow;
  live: LiveStage;
  dock: TalkDock;
  aim: CameraAimControls;
  ptz: CameraPtzControls | null;
  presets: CameraPresets | null;
  controls: LiveControls;
  note: TalkNote | null;
  sections: readonly SettingsSection[];
  access: { update: boolean; remove: boolean; clips: boolean; managePresets: boolean };
  poster: string | null;
};

function flagsOf(features: ICameraCapabilities | null) {
  return {
    ptz: features?.ptz === true,
    talk: features?.talk === true,
    alarm: features?.alarm === true,
    presets: features?.presets === true,
    talkKnown: features ? features.talk === true : null,
  };
}

function rightsOf({ can, clips, cameraActions }: ReturnType<typeof useCapabilities>) {
  return {
    update: can('camera', 'update'),
    remove: can('camera', 'delete'),
    clips: clips.view,
    managePresets: cameraActions.managePresets,
  };
}

export function useCameraLive(id: string, camera: ICameraCacheRow | null): CameraLive | null {
  const capabilities = useCapabilities();
  const { cameraActions, guard } = capabilities;
  const rights = rightsOf(capabilities);
  const { features } = useCameraFeatures(id, camera);
  const flags = flagsOf(features);
  const dock = useTalkDock(id);
  const argusCall = useVoiceCallActive();
  const appSiren = useAppSirenEnabled();
  const live = useLiveStage({
    cameraId: id,
    enabled: camera?.isEnabled === true,
    masked: camera ? cameraPrivacyMasked(camera.privacyState) : false,
    online: camera?.isOnline !== false,
    silenced: dock.silencesLive,
  });
  const aimable = flags.ptz;
  const aim = useCameraAim({
    cameraId: id,
    synced: camera?.aim,
    enabled: aimable && cameraActions.watch,
  });
  const ptzControls = useCameraPtz(id, ptzHoldRenewMs(features));
  const mic = voiceCallSupported();
  const access = { talk: cameraActions.talk, aim: cameraActions.aim };
  const controls = liveControlsOf({
    stage: live.stage.kind,
    access,
    talk: flags.talk,
    ptz: aimable,
    mic,
    argusCall,
    siren: sirenOffered({
      allowed: cameraActions.siren,
      supported: flags.alarm,
      enabled: appSiren,
    }),
    sirenActive: dock.siren.phase === 'countdown' || dock.siren.sounding,
    audio: live.hasAudio,
    looking: aim.activity === 'watching',
  });
  const presetsShown = controls.ptz && flags.presets;
  const presets = useCameraPresets({
    cameraId: id,
    enabled: presetsShown,
    onHomeSet: () => void aim.reload(),
  });
  useViewerLease(id, controls.ptz && live.ptzShown, aim.apply);
  const poster = useCameraPoster(camera);
  if (!camera) return null;
  return {
    camera,
    live,
    dock,
    aim,
    ptz: controls.ptz ? ptzControls : null,
    presets: presetsShown ? presets : null,
    controls,
    note: talkNoteOf({
      stage: live.stage.kind,
      access,
      mic,
      argusCall,
      talk: flags.talkKnown,
      cloudless: camera.driver === 'tapo',
    }),
    sections: settingsSectionsOf({
      features,
      update: rights.update,
      remove: rights.remove,
      aim: cameraActions.aim,
      maintenance: guard.maintenance,
    }),
    access: rights,
    poster,
  };
}

function useCameraPoster(camera: ICameraCacheRow | null): string | null {
  const thumbnails = useCameraThumbnails(camera ? [camera] : [], false);
  return camera ? (thumbnails.get(camera.id) ?? null) : null;
}

export function useCameraRow(id: string): ICameraCacheRow | null {
  const { cameras } = useCameraRows();
  return cameras.find((item) => item.id === id) ?? null;
}
