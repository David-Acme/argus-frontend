import type { ICameraMediaOpenInput, ICameraMediaService, ICameraMediaSession } from '@/core/interfaces';
import { netService } from '@/core/services/net';
import { serviceUrl } from '@/core/services/net/net-routes';
import { sessionService } from '@/core/services/session.service';
import { useAuthStore } from '@/core/stores';
import { CAMERA_STREAM_AUTH_RENEW_MS, CAMERA_STREAM_WS_PATH } from '@/features/cameras/constants';
import { CameraMediaSession, type CameraMediaDeps } from '@/features/cameras/services/camera-media-session';

export const mediaDeps: CameraMediaDeps = {
  openSocket: async (accessToken) => {
    const instance = await netService.instance();
    if (!instance) throw new Error('CAMERA_STREAM_NO_SESSION');
    return netService.openSocket({
      url: serviceUrl(instance, CAMERA_STREAM_WS_PATH, 'wss'),
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
  credential: () => sessionService.credential(),
  refresh: (failed) => sessionService.refreshSession(failed),
  watchAccessToken: (listener) =>
    useAuthStore.subscribe((state, previous) => {
      if (state.accessToken !== previous.accessToken) listener(state.accessToken);
    }),
  renewIntervalMs: CAMERA_STREAM_AUTH_RENEW_MS,
};

class CameraMediaService implements ICameraMediaService {
  open(input: ICameraMediaOpenInput): Promise<ICameraMediaSession> {
    return Promise.resolve(new CameraMediaSession(input, mediaDeps).start());
  }
}

export const cameraMediaService: ICameraMediaService = new CameraMediaService();
