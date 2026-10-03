import { type HybridObject } from 'react-native-nitro-modules';

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmark {
  x: number;
  y: number;
}

export interface FaceDetection {
  bounds: FaceBounds;
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  leftEye: FaceLandmark | null;
  rightEye: FaceLandmark | null;
  nose: FaceLandmark | null;
  mouth: FaceLandmark | null;
}

export interface FaceFrame {
  luminance: number;
  faces: FaceDetection[];
}

export interface ArgusFace extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  detectFaces(jpegUri: string): Promise<FaceFrame>;
}