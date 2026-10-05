export type CameraStreamQuality = 'main' | 'sub';

export type CameraStreamState =
  'connecting' | 'live' | 'reconnecting' | 'offline' | 'unavailable' | 'closed';

export type CameraTransport = 'webrtc' | 'ws';

export type CameraLiveNotice =
  | 'camera-disabled'
  | 'viewers-total'
  | 'viewers-camera'
  | 'viewers-user'
  | 'session-ended';

export type CameraNativeRtcStream = {
  toURL(): string;
};

export type CameraRtcStream = MediaStream | CameraNativeRtcStream;
