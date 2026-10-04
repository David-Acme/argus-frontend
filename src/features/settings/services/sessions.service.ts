import { authSessionListSchema } from '@/core/contracts/session.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { authService } from '@/core/services/auth.service';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { AuthSessionList, SessionRevokeResult } from '@/core/types';

const SESSIONS_PATH = '/auth/sessions';

class SessionsService {
  async list(): Promise<IServiceResponse<AuthSessionList>> {
    const response = await httpService.get<unknown>(SESSIONS_PATH);
    if (!response.ok) return { ...response, info: null };
    const parsed = authSessionListSchema.safeParse(response.info);
    if (!parsed.success) {
      return errorResponse(
        response.status,
        'INVALID_RESPONSE',
        'The session list is not in the expected shape'
      );
    }
    return { ...response, info: parsed.data };
  }

  revoke(id: string): Promise<IServiceResponse<SessionRevokeResult>> {
    return httpService.delete<SessionRevokeResult>(`${SESSIONS_PATH}/${encodeURIComponent(id)}`);
  }

  revokeOthers(): Promise<IServiceResponse<SessionRevokeResult>> {
    return httpService.delete<SessionRevokeResult>(`${SESSIONS_PATH}?scope=others`);
  }

  revokeAll(): Promise<IServiceResponse<SessionRevokeResult>> {
    return authService.logoutEverywhere();
  }
}

export const sessionsService = new SessionsService();
