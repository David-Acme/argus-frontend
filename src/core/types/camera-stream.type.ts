export type CameraStreamQuality = 'main' | 'sub';

export type CameraStreamState =
  'connecting' | 'live' | 'reconnecting' | 'offline' | 'unavailable' | 'closed';

export type CameraTransport = 'webrtc' | 'ws';

export type CameraNativeRtcStream = {
  toURL(): string;
};

export type CameraRtcStream = MediaStream | CameraNativeRtcStream;
