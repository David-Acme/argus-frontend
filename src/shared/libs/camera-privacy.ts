import type { CameraPrivacyState } from '@/core/types';

export function parseCameraPrivacyState(value: unknown): CameraPrivacyState {
  return value === 'on' || value === 'off' ? value : 'unknown';
}

export function privacyStateOf(value: boolean | null | undefined): CameraPrivacyState {
  if (value === true) return 'on';
  if (value === false) return 'off';
  return 'unknown';
}

export function cameraPrivacyMasked(value: unknown): boolean {
  return parseCameraPrivacyState(value) === 'on';
}
