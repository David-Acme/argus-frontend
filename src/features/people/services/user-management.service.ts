import { biometricErasureSchema } from '@/core/contracts/voiceprint.contract';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type {
  IServiceResponse,
  IUserManagementRecord,
  IUserManagementUpdate,
} from '@/core/interfaces';
import type { BiometricErasure } from '@/core/types';

const USER_PATH = '/user';

class UserManagementService {
  list(): Promise<IServiceResponse<IUserManagementRecord[]>> {
    return httpService.get<IUserManagementRecord[]>(USER_PATH);
  }

  update(
    id: number,
    input: IUserManagementUpdate,
  ): Promise<IServiceResponse<IUserManagementRecord>> {
    return httpService.patch<IUserManagementRecord>(`${USER_PATH}/${id}`, input);
  }

  deactivate(id: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(`${USER_PATH}/${id}`);
  }

  async eraseBiometrics(id: number): Promise<IServiceResponse<BiometricErasure>> {
    const response = await httpService.delete<unknown>(`${USER_PATH}/${id}/biometrics`);
    if (!response.ok) return { ...response, info: null };
    const parsed = biometricErasureSchema.safeParse(response.info);
    if (!parsed.success) {
      return errorResponse(response.status, 'INVALID_RESPONSE', 'The erasure answer is not in the expected shape');
    }
    return { ...response, info: parsed.data };
  }
}

export const userManagementService = new UserManagementService();
