import { biometricErasureSchema } from '@/core/contracts/voiceprint.contract';
import { expectShape, httpService } from '@/core/services/http';
import type {
  IServiceResponse,
  IUserManagementRecord,
  IUserManagementUpdate,
} from '@/core/interfaces';
import type { BiometricErasure } from '@/core/types';

const USER_PATH = '/user';

class UserManagementService {
  update(
    id: number,
    input: IUserManagementUpdate
  ): Promise<IServiceResponse<IUserManagementRecord>> {
    return httpService.patch<IUserManagementRecord>(`${USER_PATH}/${id}`, input);
  }

  deactivate(id: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(`${USER_PATH}/${id}`);
  }

  async eraseBiometrics(id: number): Promise<IServiceResponse<BiometricErasure>> {
    const response = await httpService.delete<unknown>(`${USER_PATH}/${id}/biometrics`);
    return expectShape(response, biometricErasureSchema, 'The erasure answer');
  }
}

export const userManagementService = new UserManagementService();
