import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import type {
  VoiceprintChallenge,
  VoiceprintStatus,
  VoiceprintVerification,
  VoiceSampleCheck,
} from '@/core/types';

const VOICEPRINT_PATH = '/voiceprint/me';

type VoiceSampleInput = {
  audio: string;
  challengeId: string;
  phrase: number;
};

type VoiceprintEnrollInput = {
  challengeId: string;
  consentVersion: string;
};

class VoiceprintService {
  status(): Promise<IServiceResponse<VoiceprintStatus>> {
    return httpService.get<VoiceprintStatus>(VOICEPRINT_PATH);
  }

  challenge(lang: string): Promise<IServiceResponse<VoiceprintChallenge>> {
    return httpService.post<VoiceprintChallenge>(`${VOICEPRINT_PATH}/challenge`, { lang });
  }

  sample(input: VoiceSampleInput): Promise<IServiceResponse<VoiceSampleCheck>> {
    return httpService.post<VoiceSampleCheck>(`${VOICEPRINT_PATH}/sample`, input);
  }

  enroll(input: VoiceprintEnrollInput): Promise<IServiceResponse<VoiceprintStatus>> {
    return httpService.post<VoiceprintStatus>(VOICEPRINT_PATH, { consent: true, ...input });
  }

  verify(audio: string): Promise<IServiceResponse<VoiceprintVerification>> {
    return httpService.post<VoiceprintVerification>(`${VOICEPRINT_PATH}/verify`, { audio });
  }

  remove(): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(VOICEPRINT_PATH);
  }
}

export const voiceprintService = new VoiceprintService();
