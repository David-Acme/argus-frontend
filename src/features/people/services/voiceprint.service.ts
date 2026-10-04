import { voiceprintDirectorySchema } from '@/core/contracts/voiceprint.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { VoiceprintDirectory } from '@/core/types';

const DIRECTORY_PATH = '/voiceprint/users';

const userPath = (userId: number) => `/voiceprint/user/${encodeURIComponent(String(userId))}`;

class VoiceprintService {
  async directory(): Promise<IServiceResponse<VoiceprintDirectory>> {
    const response = await httpService.get<unknown>(DIRECTORY_PATH);
    if (!response.ok) return { ...response, info: null };
    const parsed = voiceprintDirectorySchema.safeParse(response.info);
    if (!parsed.success) {
      return errorResponse(response.status, 'INVALID_RESPONSE', 'The voice directory is not in the expected shape');
    }
    return { ...response, info: parsed.data };
  }

  forget(userId: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(userPath(userId));
  }
}

export const voiceprintService = new VoiceprintService();
