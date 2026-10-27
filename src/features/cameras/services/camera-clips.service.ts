import type {
  ICameraClip,
  ICameraClipContent,
  ICameraClipPreview,
  ICameraRecordingState,
  IServiceResponse,
} from '@/core/interfaces';
import { RemoteFeed } from '@/core/services/paging';
import { httpService } from '@/core/services/http';
import type { RemotePage } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import {
  CLIP_FEED_ALL,
  CLIP_FEED_PAGE,
  clipContentOf,
  clipFeedPath,
  clipPageOf,
  compareClips,
  type ClipCursor,
} from '@/features/cameras/model/camera-clips';

function readClipPage(
  response: IServiceResponse<unknown>
): IServiceResponse<RemotePage<ICameraClip, ClipCursor>> {
  return { ...response, info: response.ok ? clipPageOf(response.info) : null };
}

function readPoster(response: IServiceResponse<unknown>): IServiceResponse<ICameraClipContent> {
  return { ...response, info: response.ok ? clipContentOf(response.info) : null };
}

class CameraClipsService {
  async page(
    scope: string,
    cursor: ClipCursor | null
  ): Promise<IServiceResponse<RemotePage<ICameraClip, ClipCursor>>> {
    return readClipPage(await httpService.get(clipFeedPath(scope, cursor, CLIP_FEED_PAGE)));
  }

  recording(): Promise<IServiceResponse<ICameraRecordingState>> {
    return httpService.get('/camera/recording');
  }

  async poster(cameraId: string, clipId: string): Promise<IServiceResponse<ICameraClipContent>> {
    return readPoster(await httpService.get(`/camera/${cameraId}/clips/${clipId}/poster`));
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

export const clipFeed = new RemoteFeed<ICameraClip, ClipCursor>({
  key: VIEW_CACHE_KEYS.clipFeed,
  keyOf: (clip) => clip.id,
  compare: compareClips,
  fetch: (scope, cursor) => cameraClipsService.page(scope, cursor),
  pinned: [CLIP_FEED_ALL],
});
