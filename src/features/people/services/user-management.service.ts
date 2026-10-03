import { httpService } from '@/core/services/http';
import type {
  IServiceResponse,
  IUserManagementRecord,
  IUserManagementUpdate,
} from '@/core/interfaces';

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
}

export const userManagementService = new UserManagementService();
