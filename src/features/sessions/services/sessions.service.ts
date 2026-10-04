import type { z } from 'zod';
import {
  authSessionListSchema,
  sessionRevokeResultSchema,
  userSessionsOverviewSchema,
} from '@/core/contracts/session.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { authService } from '@/core/services/auth.service';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type { AuthSessionList, SessionRevokeResult, UserSessionsOverview } from '@/core/types';

const SESSIONS_PATH = '/auth/sessions';
const USERS_PATH = '/auth/users';

function parsed<T>(
  response: IServiceResponse<unknown>,
  schema: z.ZodType<T>,
  what: string
): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const result = schema.safeParse(response.info);
  if (!result.success) {
    return errorResponse(response.status, 'INVALID_RESPONSE', `${what} is not in the expected shape`);
  }
  return { ...response, info: result.data };
}

const userPath = (userId: number) => `${USERS_PATH}/${encodeURIComponent(String(userId))}/sessions`;

class SessionsService {
  async list(): Promise<IServiceResponse<AuthSessionList>> {
    return parsed(await httpService.get<unknown>(SESSIONS_PATH), authSessionListSchema, 'The session list');
  }

  async revoke(id: string): Promise<IServiceResponse<SessionRevokeResult>> {
    return parsed(
      await httpService.delete<unknown>(`${SESSIONS_PATH}/${encodeURIComponent(id)}`),
      sessionRevokeResultSchema,
      'The revocation'
    );
  }

  async revokeOthers(): Promise<IServiceResponse<SessionRevokeResult>> {
    return parsed(
      await httpService.delete<unknown>(`${SESSIONS_PATH}?scope=others`),
      sessionRevokeResultSchema,
      'The revocation'
    );
  }

  revokeAll(): Promise<IServiceResponse<SessionRevokeResult>> {
    return authService.logoutEverywhere();
  }

  async listEveryUser(): Promise<IServiceResponse<UserSessionsOverview>> {
    return parsed(
      await httpService.get<unknown>(`${USERS_PATH}/sessions`),
      userSessionsOverviewSchema,
      'The connected devices'
    );
  }

  async listOfUser(userId: number): Promise<IServiceResponse<AuthSessionList>> {
    return parsed(await httpService.get<unknown>(userPath(userId)), authSessionListSchema, 'The session list');
  }

  async revokeOfUser(userId: number, id: string): Promise<IServiceResponse<SessionRevokeResult>> {
    return parsed(
      await httpService.delete<unknown>(`${userPath(userId)}/${encodeURIComponent(id)}`),
      sessionRevokeResultSchema,
      'The revocation'
    );
  }

  async revokeAllOfUser(userId: number): Promise<IServiceResponse<SessionRevokeResult>> {
    return parsed(
      await httpService.delete<unknown>(userPath(userId)),
      sessionRevokeResultSchema,
      'The revocation'
    );
  }
}

export const sessionsService = new SessionsService();
