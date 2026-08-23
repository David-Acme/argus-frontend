import { httpService } from '@/core/services/http.service';
import type { IServiceResponse } from '@/core/interfaces';
import type { PortraitPreviewImage } from '@/shared/libs/portrait-preview';

export { portraitDataUri } from '@/shared/libs/portrait-preview';

type PortraitCapability = {
  token: string;
  expiresAt: number;
};

const PORTRAIT_PREVIEW_PATH = '/portrait-preview';

class PortraitPreviewService {
  createCapability(userId: number): Promise<IServiceResponse<PortraitCapability>> {
    return httpService.get<PortraitCapability>(`${PORTRAIT_PREVIEW_PATH}/${userId}`);
  }

  consume(token: string): Promise<IServiceResponse<PortraitPreviewImage>> {
    return httpService.get<PortraitPreviewImage>(`${PORTRAIT_PREVIEW_PATH}/${token}/content`);
  }
}

export const portraitPreviewService = new PortraitPreviewService();
