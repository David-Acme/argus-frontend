import { createVoiceMic } from '@/features/voice';
import { cameraMediaService, mediaDeps } from '@/features/cameras/services/camera-media.service';
import {
  CameraCallSession,
  type CameraCallDeps,
  type CameraCallOptions,
} from '@/features/cameras/services/camera-call-session';

export type { CameraCallOptions, CameraCallSnapshot } from '@/features/cameras/services/camera-call-session';

const callDeps: CameraCallDeps = {
  ...mediaDeps,
  openListen: (input) => cameraMediaService.open(input),
  createMic: () => createVoiceMic(),
};

export class CameraCall extends CameraCallSession {
  constructor(options: CameraCallOptions) {
    super(options, callDeps);
  }
}
