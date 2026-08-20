import { type HybridObject } from 'react-native-nitro-modules';

/** Normalized bounding box in image space (0..1, origin top-left). */
export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Normalized landmark point (0..1, origin top-left). */
export interface FaceLandmark {
  x: number;
  y: number;
}

export interface FaceDetection {
  bounds: FaceBounds;
  /** Euler Y in degrees (left/right tilt). */
  yawDeg: number;
  /** Euler X in degrees (up/down tilt). MLKit only; 0 on Vision. */
  pitchDeg: number;
  /** Euler Z in degrees (in-plane rotation). */
  rollDeg: number;
  /** 0..1. 0 when the platform does not report eye state. */
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  leftEye: FaceLandmark | null;
  rightEye: FaceLandmark | null;
  nose: FaceLandmark | null;
  mouth: FaceLandmark | null;
}

export interface FaceFrame {
  /** Average luminance of the frame (0..255). 0 when not available. */
  luminance: number;
  faces: FaceDetection[];
}

export interface ArgusFace extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  /**
   * Detects faces in a JPEG file on disk (absolute file URI). The file is
   * decoded and analyzed on a background thread; boxes are normalized to
   * image space (0..1). Ideal for capture-guidance sampling loops.
   */
  detectFaces(jpegUri: string): Promise<FaceFrame>;
}