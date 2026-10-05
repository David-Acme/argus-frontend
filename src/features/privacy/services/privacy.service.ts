import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { HouseholdPrivacyPatch, PrivacyDirectory, PrivacyMe } from '@/core/types';
import type { PrivacyDecision } from '@/features/privacy/model/privacy';
import type { z } from 'zod';

const ME = '/privacy/me';
const USERS = '/privacy/users';
const HOUSEHOLD = '/privacy/household';

function parsed<T>(response: IServiceResponse<unknown>, schema: z.ZodType<T>): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const result = schema.safeParse(response.info);
  if (!result.success) {
    return errorResponse(response.status, 'INVALID_RESPONSE', 'The privacy answer is not in the expected shape');
  }
  return { ...response, info: result.data };
}

class PrivacyService {
  async me(): Promise<IServiceResponse<PrivacyMe>> {
    return parsed(await httpService.get<unknown>(ME), privacyMeSchema);
  }

  async decide(decision: PrivacyDecision): Promise<IServiceResponse<PrivacyMe>> {
    return parsed(await httpService.put<unknown>(ME, decision), privacyMeSchema);
  }

  async directory(): Promise<IServiceResponse<PrivacyDirectory>> {
    return parsed(await httpService.get<unknown>(USERS), privacyDirectorySchema);
  }

  async updateHousehold(patch: HouseholdPrivacyPatch): Promise<IServiceResponse<PrivacyDirectory>> {
    return parsed(await httpService.patch<unknown>(HOUSEHOLD, patch), privacyDirectorySchema);
  }
}

export const privacyService = new PrivacyService();
