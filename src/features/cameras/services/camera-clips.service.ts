import type {
  ICameraClipContent,
  ICameraClipPreview,
  ICameraClips,
  IServiceResponse,
} from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { CLIP_PAGE_SIZE, type ClipCursor } from '@/features/cameras/model/camera-clips';

class CameraClipsService {
  list(cameraId: string, cursor?: ClipCursor): Promise<IServiceResponse<ICameraClips>> {
    const query = cursor
      ? `?before=${cursor.before}&beforeId=${cursor.beforeId}&limit=${CLIP_PAGE_SIZE}`
      : `?limit=${CLIP_PAGE_SIZE}`;
    return httpService.get(`/camera/${cameraId}/clips${query}`);
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
