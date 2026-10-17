import { useCallback } from 'react';
import type { ICameraRecordingState } from '@/core/interfaces';
import { CAMERA_RECORDING_RESOURCES } from '@/features/cameras/model/camera-recording';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';

export function useCameraRecording(enabled: boolean): ICameraRecordingState | null {
  const load = useCallback(() => cameraClipsService.recording(), []);
  const resource = useRemoteResource<ICameraRecordingState>({
    cacheKey: VIEW_CACHE_KEYS.cameraRecording,
    load,
    enabled,
    resources: CAMERA_RECORDING_RESOURCES,
  });
  return resource.data;
}
