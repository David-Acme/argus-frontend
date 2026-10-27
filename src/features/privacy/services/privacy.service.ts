import { privacyDirectorySchema, privacyMeSchema } from '@/core/contracts/privacy.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import type { HouseholdPrivacyPatch, MinorMark, PrivacyDirectory, PrivacyMe } from '@/core/types';
import { minorPath } from '@/features/privacy/model/minor';
import type { PrivacyDecision } from '@/features/privacy/model/privacy';

const ME = '/privacy/me';
const USERS = '/privacy/users';
const HOUSEHOLD = '/privacy/household';

class PrivacyService {
  async me(): Promise<IServiceResponse<PrivacyMe>> {
    return expectShape(await httpService.get<unknown>(ME), privacyMeSchema, 'The privacy answer');
  }

  async decide(decision: PrivacyDecision): Promise<IServiceResponse<PrivacyMe>> {
    return expectShape(
      await httpService.put<unknown>(ME, decision),
      privacyMeSchema,
      'The privacy answer'
    );
  }

  async directory(): Promise<IServiceResponse<PrivacyDirectory>> {
    return expectShape(
      await httpService.get<unknown>(USERS),
      privacyDirectorySchema,
      'The privacy answer'
    );
  }

  async markMinor(userId: number, mark: MinorMark): Promise<IServiceResponse<PrivacyDirectory>> {
    return expectShape(
      await httpService.put<unknown>(minorPath(userId), mark),
      privacyDirectorySchema,
      'The privacy answer'
    );
  }

  async updateHousehold(patch: HouseholdPrivacyPatch): Promise<IServiceResponse<PrivacyDirectory>> {
    return expectShape(
      await httpService.patch<unknown>(HOUSEHOLD, patch),
      privacyDirectorySchema,
      'The privacy answer'
    );
  }
}

export const privacyService = new PrivacyService();
