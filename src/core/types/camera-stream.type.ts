/** Stream selection: `sub` is the low-bandwidth substream for mobile viewing. */
export type CameraStreamQuality = 'main' | 'sub';

export type CameraStreamState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'closed';
