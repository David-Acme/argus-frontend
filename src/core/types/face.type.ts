import type { FaceDetection } from 'argus-face';

/** Live capture-guide state derived from the native face detector. */
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

/** Snapshot of the capture-guidance loop (see `use-face-guide`). */
export type FaceGuideSnapshot = {
  state: FaceGuideState | null;
  /** False when the native detector is unavailable → manual capture fallback. */
  available: boolean;
  luminance: number;
  /** Normalized face-center offset (-1..1) for directional hints. */
  offset: { dx: number; dy: number };
  faces: FaceDetection[];
  reset: () => void;
};
