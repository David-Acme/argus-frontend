import { NativeModules, TurboModuleRegistry } from 'react-native';
import type { ICameraRtcOpenInput, ICameraRtcService, ICameraRtcSession } from '@/core/interfaces';
import type { CameraRtcStream } from '@/core/types';
import { openRtcSession, type RtcPeer, type RtcPlatform, type RtcTrackEvent } from './camera-rtc-session';

function nativeWebRtcLinked(): boolean {
  return TurboModuleRegistry.get('WebRTCModule') != null || NativeModules.WebRTCModule != null;
}

function isNativeStream(value: unknown): value is CameraRtcStream {
  return typeof (value as { toURL?: unknown } | null)?.toURL === 'function';
}

const nativePlatform: RtcPlatform = {
  createPeer: async () => {
    const { RTCPeerConnection } = await import('@livekit/react-native-webrtc');
    return new RTCPeerConnection({ iceServers: [] }) as unknown as RtcPeer;
  },
  streamWith: (current: CameraRtcStream | null, event: RtcTrackEvent): CameraRtcStream | null => {
    const [first] = event.streams;
    if (current || event.track.kind !== 'video') return current;
    return isNativeStream(first) ? first : null;
  },
};

class NativeCameraRtcService implements ICameraRtcService {
  supported(): boolean {
    return nativeWebRtcLinked();
  }

  open(input: ICameraRtcOpenInput): Promise<ICameraRtcSession> {
    return openRtcSession(nativePlatform, input);
  }
}

export const cameraRtcService: ICameraRtcService = new NativeCameraRtcService();
