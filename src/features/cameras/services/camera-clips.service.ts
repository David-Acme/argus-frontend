import type {
  ICameraClipContent,
  ICameraClipPreview,
  ICameraClips,
  ICameraRecordingState,
  IServiceResponse,
} from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { CLIP_PAGE_SIZE, type ClipCursor } from '@/features/cameras/model/camera-clips';

class CameraClipsService {
  list(
    cameraId: string,
    cursor?: ClipCursor,
    limit = CLIP_PAGE_SIZE
  ): Promise<IServiceResponse<ICameraClips>> {
    const query = cursor
      ? `?before=${cursor.before}&beforeId=${cursor.beforeId}&limit=${limit}`
      : `?limit=${limit}`;
    return httpService.get(`/camera/${cameraId}/clips${query}`);
  }

  recording(): Promise<IServiceResponse<ICameraRecordingState>> {
    return httpService.get('/camera/recording');
  }

  preview(cameraId: string, clipId: string): Promise<IServiceResponse<ICameraClipPreview>> {
    return httpService.get(`/camera/${cameraId}/clips/${clipId}/preview`);
  }

  content(token: string): Promise<IServiceResponse<ICameraClipContent>> {
    return httpService.get(`/clip/${token}/content`);
  }

  remove(cameraId: string, clipId: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/camera/${cameraId}/clips/${clipId}`);
  }
}

export const cameraClipsService = new CameraClipsService();
