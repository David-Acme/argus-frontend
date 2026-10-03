export type CameraStreamQuality = 'main' | 'sub';

export type CameraStreamState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'closed';
