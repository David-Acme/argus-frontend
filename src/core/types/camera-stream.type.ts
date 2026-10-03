export type CameraStreamQuality = 'main' | 'sub';

export type CameraStreamState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline'
  | 'unavailable'
  | 'closed';
