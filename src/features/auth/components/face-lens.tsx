import type { CameraView } from 'expo-camera';
import type { RefObject } from 'react';
import { StyleSheet } from 'react-native';
import { DeviceCamera } from '@/shared/components/device-camera/device-camera';
import { IS_ANDROID } from '@/shared/constants';
import type { FaceDetectionEvent } from '@/features/auth/hooks/use-face-guide';

export type FaceLensProps = {
  active: boolean;
  cameraRef: RefObject<CameraView | null>;
  detects: boolean;
  onReady: () => void;
  onFaces: (event: FaceDetectionEvent) => void;
};

export function FaceLens({ active, cameraRef, detects, onReady, onFaces }: FaceLensProps) {
  if (!active) return null;
  return (
    <DeviceCamera
      ref={cameraRef}
      style={StyleSheet.absoluteFill}
      facing="front"
      mute
      animateShutter={false}
      onCameraReady={onReady}
      faceDetectionEnabled={IS_ANDROID ? detects : undefined}
      onFacesDetected={IS_ANDROID ? onFaces : undefined}
      active
    />
  );
}
