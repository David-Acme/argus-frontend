import type { ICameraRecordingState } from '@/core/interfaces';
import type { ResourceMatch } from '@/core/types';

export const CAMERA_RECORDING_RESOURCES: readonly ResourceMatch[] = [
  { domain: 'camera', scope: 'recording' },
];

export function recordingPaused(state: ICameraRecordingState | null | undefined): boolean {
  return state?.paused === true;
}
