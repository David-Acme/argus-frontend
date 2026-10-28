import { voiceprintDirectorySchema } from '@/core/contracts/voiceprint.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import type { VoiceprintDirectory } from '@/core/types';

const DIRECTORY_PATH = '/voiceprint/users';

const userPath = (userId: number) => `/voiceprint/user/${encodeURIComponent(String(userId))}`;

class VoiceprintService {
  async directory(): Promise<IServiceResponse<VoiceprintDirectory>> {
    const response = await httpService.get<unknown>(DIRECTORY_PATH);
    return expectShape(response, voiceprintDirectorySchema, 'The voice directory');
  }

  forget(userId: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(userPath(userId));
  }
}

export const voiceprintService = new VoiceprintService();
