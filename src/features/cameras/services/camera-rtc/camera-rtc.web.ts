import type { ICameraRtcOpenInput, ICameraRtcService, ICameraRtcSession } from '@/core/interfaces';
import type { CameraRtcStream } from '@/core/types';
import { openRtcSession, type RtcPeer, type RtcPlatform, type RtcTrackEvent } from './camera-rtc-session';

function browserSupportsRtc(): boolean {
  return typeof RTCPeerConnection === 'function' && typeof MediaStream === 'function';
}

const browserPlatform: RtcPlatform = {
  createPeer: () => Promise.resolve(new RTCPeerConnection({ iceServers: [] }) as unknown as RtcPeer),
  streamWith: (current: CameraRtcStream | null, event: RtcTrackEvent): CameraRtcStream | null => {
    const stream = current instanceof MediaStream ? current : new MediaStream();
    stream.addTrack(event.track as unknown as MediaStreamTrack);
    return stream;
  },
};

class BrowserCameraRtcService implements ICameraRtcService {
  supported(): boolean {
    return browserSupportsRtc();
  }

  open(input: ICameraRtcOpenInput): Promise<ICameraRtcSession> {
    return openRtcSession(browserPlatform, input);
  }
}

export const cameraRtcService: ICameraRtcService = new BrowserCameraRtcService();
