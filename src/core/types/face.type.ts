import type { FaceDetection } from 'argus-face';

export type FaceGuideState =
  | 'no-face'
  | 'multiple-faces'
  | 'too-far'
  | 'too-close'
  | 'off-center'
  | 'tilted'
  | 'eyes-closed'
  | 'low-light'
  | 'ready';

export type FaceGuideSnapshot = {
  state: FaceGuideState | null;
  available: boolean;
  luminance: number;
  offset: { dx: number; dy: number };
  faces: FaceDetection[];
  reset: () => void;
};
