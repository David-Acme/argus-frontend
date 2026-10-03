import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import { sessionService } from '@/core/services/session.service';
import { useLocaleStore } from '@/core/stores';
import { LOGOUT_REVOKE_TIMEOUT_MS } from '@/shared/constants';
import type {
  ICreateDeviceLoginResponse,
  IDeviceLoginStatusResponse,
  IServerStatus,
  IRegisterInput,
  IAuthSession,
  IResponseLoginDto,
  IResponseStatusDto,
  IServiceResponse,
} from '@/core/interfaces';

const LOGIN_PATH = '/auth/login';
const REGISTER_PATH = '/auth/register';
const SERVER_STATUS_PATH = '/pairing/status';
const STATUS_PATH = '/auth/status';
const LOGOUT_PATH = '/auth/logout';
const DEVICE_LOGIN_PATH = '/auth/device-login';

const FACE_FILE = { name: 'image', uri: '', filename: 'face.jpg', contentType: 'image/jpeg' };

class AuthService {
  async login(imageUri: string): Promise<IServiceResponse<IResponseLoginDto>> {
    const response = await httpService.postMultipart<IResponseLoginDto>(
      LOGIN_PATH,
      { ...FACE_FILE, uri: imageUri },
      undefined,
      { skipAuthRetry: true },
    );
    await this.establishLoginSession(response);
    return response;
  }

  async register(input: IRegisterInput): Promise<IServiceResponse<IResponseLoginDto>> {
    const lang = useLocaleStore.getState().language;
    const response = await httpService.postMultipart<IResponseLoginDto>(REGISTER_PATH, {
      ...FACE_FILE,
      uri: input.imageUri,
    }, {
      lang,
      ...(input.name ? { name: input.name } : {}),
      ...(input.inviteCode ? { inviteCode: input.inviteCode } : {}),
    }, { skipAuthRetry: true });
    await this.establishLoginSession(response);
    return response;
  }

  async serverStatus(): Promise<IServiceResponse<IServerStatus>> {
    return httpService.get<IServerStatus>(SERVER_STATUS_PATH, { skipAuthRetry: true });
  }

  async status(): Promise<IServiceResponse<IResponseStatusDto>> {
    return httpService.get<IResponseStatusDto>(STATUS_PATH);
  }

  async logout(): Promise<void> {
    const revoke = httpService.patch<{ updated: boolean } | null>(LOGOUT_PATH).catch(() => undefined);
    await Promise.race([
      revoke,
      new Promise<void>((resolve) => setTimeout(resolve, LOGOUT_REVOKE_TIMEOUT_MS)),
    ]);
    await sessionService.clearSession();
  }

  async createDeviceLogin(): Promise<IServiceResponse<ICreateDeviceLoginResponse>> {
    return httpService.post<ICreateDeviceLoginResponse>(DEVICE_LOGIN_PATH, {}, { skipAuthRetry: true });
  }

  async approveDeviceLogin(id: string): Promise<IServiceResponse<{ approved: boolean } | null>> {
    return httpService.post<{ approved: boolean } | null>(`${DEVICE_LOGIN_PATH}/${id}/approve`, {});
  }

  async pollDeviceLogin(id: string): Promise<IServiceResponse<IDeviceLoginStatusResponse>> {
    const response = await httpService.get<IDeviceLoginStatusResponse>(`${DEVICE_LOGIN_PATH}/${id}`, {
      skipAuthRetry: true,
    });
    const info = response.ok ? response.info : null;
    if (info?.status !== 'approved') return response;
    const { accessToken, refreshToken, userId, role } = info;
    if (!accessToken || !refreshToken || !userId || !role) {
      return errorResponse(response.status, 'INVALID_RESPONSE', 'The approved login is missing its session');
    }
    await sessionService.establish({
      accessToken,
      refreshToken,
      user: { id: userId, name: info.name ?? '—', role, isActive: true, personId: null },
    });
    return response;
  }

  private async establishLoginSession(
    response: IServiceResponse<IResponseLoginDto>,
  ): Promise<void> {
    if (!response.ok || !response.info) return;
    await sessionService.establish(this.toSession(response.info));
  }

  private toSession(dto: IResponseLoginDto): IAuthSession {
    return {
      accessToken: dto.accessToken,
      refreshToken: dto.refreshToken,
      user: {
        id: dto.userId,
        name: dto.name,
        role: dto.role,
        isActive: true,
        personId: dto.personId,
      },
    };
  }
}

export const authService = new AuthService();
